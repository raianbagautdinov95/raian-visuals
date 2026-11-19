(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var saveData = !!(navigator.connection && navigator.connection.saveData);
  var wide = window.matchMedia('(min-width: 900px)');
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var each = function (list, fn) { Array.prototype.forEach.call(list, fn); };

  /* ---------- Сцены первого экрана ----------
     tall — вертикальные ролики для телефона, wide — горизонтальные для компьютера.
     repeat — сколько раз подряд играет короткий ролик; film — что открывается по нажатию. */

  var PRESENTATION = {
    video: 'media/estate-presentation.mp4', poster: 'media/posters/estate-presentation.webp',
    ru: 'Презентация объекта', en: 'Property presentation'
  };
  var BUILD = {
    video: 'media/complex-build.mp4', poster: 'media/posters/complex-build.webp',
    ru: 'Комплекс строится сам', en: 'The complex builds itself'
  };
  var HERO_SCENES = [
    {
      tall: { src: 'media/hero-build.mp4', bg: 'media/posters/hero-build.webp', repeat: 1, ru: 'Комплекс строится сам', en: 'The complex builds itself', film: BUILD },
      wide: { src: 'media/hero-aerial.mp4', bg: 'media/posters/hero-aerial.webp', repeat: 2, ru: 'Комплекс с воздуха', en: 'The complex from the air', film: PRESENTATION }
    },
    {
      tall: { src: 'media/hero-pool-tall.mp4', bg: 'media/posters/hero-pool-tall.webp', repeat: 2, ru: 'Бассейн вечером', en: 'The pool in the evening', film: PRESENTATION },
      wide: { src: 'media/hero-pool.mp4', bg: 'media/posters/hero-pool.webp', repeat: 2, ru: 'Бассейн вечером', en: 'The pool in the evening', film: PRESENTATION }
    },
    {
      tall: { src: 'media/hero-entrance-tall.mp4', bg: 'media/posters/hero-entrance-tall.webp', repeat: 2, ru: 'Вход вечером', en: 'The entrance in the evening', film: PRESENTATION },
      wide: { src: 'media/hero-entrance.mp4', bg: 'media/posters/hero-entrance.webp', repeat: 2, ru: 'Вход вечером', en: 'The entrance in the evening', film: PRESENTATION }
    }
  ];

  var hero = document.querySelector('.hero');
  var panels = Array.prototype.slice.call(document.querySelectorAll('.panel'));
  var heroVideos = panels.map(function (p) { return p.querySelector('video'); });
  var bars = Array.prototype.slice.call(document.querySelectorAll('.hero__bars button'));
  var pauseBtn = document.querySelector('.hero__pause');
  var heroMotion = !reduceMotion && !saveData;
  var heroStarted = false;
  var heroPausedByUser = false;
  var heroInView = true;
  var playerIsOpen = false;
  var active = 0;
  var plays = [0, 0, 0];
  var currentTrigger = null;

  function scene(i) { return HERO_SCENES[i][wide.matches ? 'wide' : 'tall']; }

  /* Подписи и ссылки сцен зависят от языка и от ширины экрана */
  function refreshHeroText() {
    var lang = root.lang === 'en' ? 'en' : 'ru';
    panels.forEach(function (p, i) {
      var s = scene(i);
      p.setAttribute('href', s.film.video);
      p.setAttribute('data-video', s.film.video);
      p.setAttribute('data-poster', s.film.poster);
      p.setAttribute('data-title-ru', s.film.ru);
      p.setAttribute('data-title-en', s.film.en);
      var name = p.querySelector('.panel__name');
      if (name) name.textContent = s[lang];
      p.setAttribute('aria-label', (lang === 'en' ? 'Watch: ' : 'Смотреть: ') + s.film[lang]);
      if (bars[i]) bars[i].setAttribute('aria-label', (lang === 'en' ? 'Scene ' : 'Сцена ') + (i + 1) + ': ' + s[lang]);
    });
  }

  function showPoster(i) {
    panels[i].style.backgroundImage = 'url("' + scene(i).bg + '")';
  }

  function loadHero(i) {
    var v = heroVideos[i];
    showPoster(i);
    if (v.getAttribute('src')) return;
    v.preload = 'auto';
    v.muted = true;
    v.src = scene(i).src;
  }

  function syncHero() {
    panels.forEach(function (p, i) { p.classList.toggle('is-active', i === active); });
    bars.forEach(function (b, i) {
      b.classList.toggle('is-active', i === active);
      b.classList.toggle('is-done', i < active);
      if (i !== active) b.style.setProperty('--p', 0);
    });
    showPoster(active);
    if (!heroMotion || !heroStarted) return;
    var canPlay = !heroPausedByUser && heroInView && !playerIsOpen;
    heroVideos.forEach(function (v, i) {
      v.loop = false;
      if (canPlay && i === active) {
        loadHero(i);
        var p = v.play();
        if (p && p.catch) p.catch(function () { /* автозапуск запрещён: остаётся обложка */ });
      } else {
        v.pause();
      }
    });
  }

  var cubeTimer = 0;
  function clearCube() {
    panels.forEach(function (p) { p.classList.remove('cube-out-next', 'cube-in-next', 'cube-out-prev', 'cube-in-prev'); });
  }

  function showHero(i, dir) {
    var from = active;
    active = (i + panels.length) % panels.length;
    plays[active] = 0;
    var v = heroVideos[active];
    if (v.getAttribute('src')) { try { v.currentTime = 0; } catch (e) { /* ролик ещё не готов */ } }
    if (from !== active && !wide.matches && heroMotion && heroStarted) {
      /* телефон: уходящая сцена поворачивается гранью куба, новая встаёт на её место */
      window.clearTimeout(cubeTimer);
      clearCube();
      var d = dir || (i > from ? 'next' : 'prev');
      panels[from].classList.add('cube-out-' + d);
      panels[active].classList.add('cube-in-' + d);
      cubeTimer = window.setTimeout(clearCube, 850);
    }
    syncHero();
  }

  heroVideos.forEach(function (v, i) {
    v.addEventListener('ended', function () {
      if (i !== active) return;
      plays[i] += 1;
      if (plays[i] < scene(i).repeat) {
        try { v.currentTime = 0; } catch (e) { /* повтор не удался, переходим дальше */ }
        var p = v.play();
        if (p && p.catch) p.catch(function () {});
      } else {
        showHero(active + 1, 'next');
      }
    });
    v.addEventListener('timeupdate', function () {
      if (i !== active || !v.duration) return;
      var lastRun = plays[i] >= scene(i).repeat - 1;
      if (lastRun && v.currentTime / v.duration > 0.4) loadHero((active + 1) % panels.length);
    });
    v.addEventListener('playing', function () { v.classList.add('is-on'); if (pauseBtn) pauseBtn.hidden = false; });
  });

  bars.forEach(function (b, i) { b.addEventListener('click', function () { showHero(i); }); });

  function tickBars() {
    var v = heroVideos[active];
    if (bars[active] && v && v.duration) {
      var r = scene(active).repeat;
      var done = (Math.min(plays[active], r - 1) + v.currentTime / v.duration) / r;
      bars[active].style.setProperty('--p', Math.min(1, done).toFixed(3));
    }
    window.requestAnimationFrame(tickBars);
  }

  /* Смена ширины экрана: ролики другой ориентации загружаются заново */
  function resetHeroMedia() {
    heroVideos.forEach(function (v, i) {
      v.pause();
      v.classList.remove('is-on');
      v.removeAttribute('src');
      v.load();
      panels[i].style.backgroundImage = '';
    });
    plays = [0, 0, 0];
    refreshHeroText();
    syncHero();
  }

  /* ---------- Язык ---------- */

  var meta = {
    ru: {
      title: 'Raian Visuals — видео, 3D и соцсети для продажи ЖК',
      description: 'Raian Visuals готовит застройщикам и риэлторам комплект для продаж: 3D-модель объекта, фотореалистичные виды, ролики с ведущим и контент для соцсетей.'
    },
    en: {
      title: 'Raian Visuals — video, 3D and social to sell new homes',
      description: 'Raian Visuals gives developers and realtors a sales kit: a 3D model, photoreal views, presenter-led films and social content.'
    }
  };

  function applyLang(lang, remember) {
    if (lang !== 'ru' && lang !== 'en') lang = 'ru';
    root.lang = lang;
    document.title = meta[lang].title;
    var d = document.querySelector('meta[name="description"]');
    if (d) d.setAttribute('content', meta[lang].description);

    each(document.querySelectorAll('[data-set-lang]'), function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-set-lang') === lang));
    });
    each(document.querySelectorAll('[data-alt-' + lang + ']'), function (el) {
      el.setAttribute('alt', el.getAttribute('data-alt-' + lang));
    });
    each(document.querySelectorAll('[data-label-' + lang + ']'), function (el) {
      el.setAttribute('aria-label', el.getAttribute('data-label-' + lang));
    });
    if (panels.length) refreshHeroText();
    var openTitle = document.getElementById('player-title');
    if (openTitle && currentTrigger) {
      openTitle.textContent = currentTrigger.getAttribute('data-title-' + lang) || '';
    }
    if (remember) {
      try { localStorage.setItem('rs-lang', lang); } catch (e) { /* хранилище недоступно, язык действует до перезагрузки */ }
    }
  }

  each(document.querySelectorAll('[data-set-lang]'), function (b) {
    b.addEventListener('click', function () { applyLang(b.getAttribute('data-set-lang'), true); });
  });
  applyLang(root.lang, false);

  /* ---------- Запуск первого экрана: ролики без звука, грузятся после страницы ---------- */

  if (panels.length) {
    syncHero();
    if (heroMotion) {
      var startHero = function () {
        heroStarted = true; syncHero(); window.requestAnimationFrame(tickBars);
        /* вступление сыграно: дальше сцены меняются сами */
        window.setTimeout(function () { hero.classList.remove('is-intro'); hero.classList.add('is-cube'); }, 1800);
      };
      if (document.readyState === 'complete') startHero();
      else window.addEventListener('load', startHero);

      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
          entries.forEach(function (e) { heroInView = e.isIntersecting; });
          syncHero();
        }, { threshold: 0.15 }).observe(hero);
      }
    }
    if (wide.addEventListener) wide.addEventListener('change', resetHeroMedia);
  }

  if (pauseBtn) {
    pauseBtn.addEventListener('click', function () {
      heroPausedByUser = !heroPausedByUser;
      pauseBtn.classList.toggle('is-paused', heroPausedByUser);
      syncHero();
    });
  }

  /* Телефон: смахивание влево и вправо листает сцены */
  if (hero && panels.length) {
    var touchX = 0, touchY = 0;
    hero.addEventListener('touchstart', function (e) {
      touchX = e.changedTouches[0].clientX; touchY = e.changedTouches[0].clientY;
    }, { passive: true });
    hero.addEventListener('touchend', function (e) {
      var dx = e.changedTouches[0].clientX - touchX, dy = e.changedTouches[0].clientY - touchY;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) showHero(active + (dx < 0 ? 1 : -1), dx < 0 ? 'next' : 'prev');
    }, { passive: true });
  }

  /* ---------- Прокрутка ----------
     Первый экран плавно уходит вглубь, шапка на компьютере получает фон,
     финальный кадр сдвигается, на телефоне кадры галереи слегка наклоняются. */

  var topBar = document.querySelector('.top');
  var contactEl = document.getElementById('contact');
  var shotLinks = Array.prototype.slice.call(document.querySelectorAll('.shot__open'));
  var pickPreview = null;
  var scrollQueued = false;

  function onScroll() {
    scrollQueued = false;
    var y = window.pageYOffset || 0;
    var vh = window.innerHeight;
    if (topBar) topBar.classList.toggle('is-stuck', y > 40);
    if (!reduceMotion) {
      if (hero) {
        var h = hero.offsetHeight || 1;
        if (y <= h) hero.style.setProperty('--sp', Math.max(0, Math.min(1, y / h)).toFixed(3));
      }
      if (contactEl) {
        var cr = contactEl.getBoundingClientRect();
        if (cr.top < vh && cr.bottom > 0) contactEl.style.setProperty('--cs', Math.max(0, Math.min(1, (vh - cr.top) / (vh + cr.height))).toFixed(3));
      }
      if (!finePointer) {
        shotLinks.forEach(function (a) {
          var r = a.getBoundingClientRect();
          if (r.bottom < -100 || r.top > vh + 100) return;
          var k = ((r.top + r.bottom) / 2 - vh / 2) / vh;
          a.style.setProperty('--sx', Math.max(-1, Math.min(1, k)).toFixed(3));
        });
      }
    }
    if (pickPreview) pickPreview();
  }
  function queueScroll() {
    if (!scrollQueued) { scrollQueued = true; window.requestAnimationFrame(onScroll); }
  }
  window.addEventListener('scroll', queueScroll, { passive: true });
  window.addEventListener('resize', queueScroll);

  /* ---------- Глубина за курсором (компьютер) ---------- */

  if (finePointer && !reduceMotion) {
    [{ el: hero, a: '--rx', b: '--ry' }, { el: contactEl, a: '--px', b: '--py' }].forEach(function (t) {
      if (!t.el) return;
      t.el.addEventListener('mousemove', function (e) {
        var r = t.el.getBoundingClientRect();
        t.el.style.setProperty(t.a, (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
        t.el.style.setProperty(t.b, (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
      });
      t.el.addEventListener('mouseleave', function () { t.el.style.setProperty(t.a, 0); t.el.style.setProperty(t.b, 0); });
    });

    /* Кадры галереи наклоняются к курсору */
    shotLinks.forEach(function (a) {
      a.addEventListener('mousemove', function (e) {
        var r = a.getBoundingClientRect();
        a.style.setProperty('--tx', ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
        a.style.setProperty('--ty', ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
        a.classList.add('is-tilting');
      });
      a.addEventListener('mouseleave', function () {
        a.style.setProperty('--tx', 0); a.style.setProperty('--ty', 0);
        a.classList.remove('is-tilting');
      });
    });
  }

  /* ---------- Живые обложки ----------
     Короткий фрагмент без звука (0,2–0,8 МБ) играет прямо в обложке:
     на компьютере при наведении, на телефоне у кадра в центре экрана. Одновременно играет один. */

  var previewShots = shotLinks.filter(function (a) { return a.hasAttribute('data-preview'); });
  var previewsAllowed = !reduceMotion && !saveData;
  var livePreview = null;

  function stopPreview(a) {
    if (!a) return;
    a._want = false;
    a.classList.remove('is-live');
    var v = a.querySelector('.shot__preview');
    if (v) v.pause();
    if (livePreview === a) livePreview = null;
  }

  function startPreview(a) {
    if (!previewsAllowed || playerIsOpen || livePreview === a) return;
    stopPreview(livePreview);
    livePreview = a;
    a._want = true;
    var v = a.querySelector('.shot__preview');
    if (!v) {
      v = document.createElement('video');
      v.className = 'shot__preview';
      v.muted = true; v.loop = true; v.playsInline = true;
      v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('aria-hidden', 'true');
      v.tabIndex = -1; v.preload = 'auto';
      v.addEventListener('playing', function () { if (a._want) a.classList.add('is-live'); });
      v.src = a.getAttribute('data-preview');
      a.insertBefore(v, a.querySelector('.shot__play'));
    }
    var p = v.play();
    if (p && p.catch) p.catch(function () { /* остаётся обычная обложка */ });
  }

  if (previewsAllowed && previewShots.length) {
    if (finePointer) {
      previewShots.forEach(function (a) {
        a.addEventListener('mouseenter', function () { startPreview(a); });
        a.addEventListener('mouseleave', function () { stopPreview(a); });
        a.addEventListener('focus', function () { startPreview(a); });
        a.addEventListener('blur', function () { stopPreview(a); });
      });
    } else {
      pickPreview = function () {
        var vh = window.innerHeight, mid = vh / 2, best = null, bestDist = vh * 0.3;
        previewShots.forEach(function (a) {
          var r = a.getBoundingClientRect();
          if (r.bottom < 0 || r.top > vh || r.width === 0) return;
          var d = Math.abs((r.top + r.bottom) / 2 - mid);
          if (d < bestDist) { bestDist = d; best = a; }
        });
        if (best) startPreview(best); else stopPreview(livePreview);
      };
    }
  }

  /* ---------- Плеер и просмотр изображений: файл загружается только после нажатия ---------- */

  var dialog = document.getElementById('player');
  var playerVideo = dialog ? dialog.querySelector('video') : null;
  var playerImage = dialog ? dialog.querySelector('.player__image') : null;
  var playerTitle = document.getElementById('player-title');
  var playerError = dialog ? dialog.querySelector('.player__error') : null;
  var canDialog = !!(dialog && typeof dialog.showModal === 'function');

  function openPlayer(trigger) {
    currentTrigger = trigger;
    var isImage = trigger.classList.contains('js-zoom');
    playerTitle.textContent = trigger.getAttribute('data-title-' + root.lang) || '';
    playerError.hidden = true;
    playerVideo.hidden = isImage;
    playerImage.hidden = !isImage;
    if (isImage) {
      var thumb = trigger.querySelector('img');
      playerImage.alt = thumb ? thumb.alt : '';
      playerImage.src = trigger.getAttribute('href');
    } else {
      playerVideo.poster = trigger.getAttribute('data-poster') || '';
      playerVideo.src = trigger.getAttribute('data-video');
    }
    dialog.showModal();
    playerIsOpen = true;
    stopPreview(livePreview);
    syncHero();
    if (!isImage) {
      var p = playerVideo.play();
      if (p && p.catch) p.catch(function () { /* зритель запустит ролик кнопкой плеера */ });
    }
  }

  function resetPlayer() {
    playerVideo.pause();
    playerVideo.removeAttribute('src');
    playerVideo.removeAttribute('poster');
    playerVideo.load();
    playerImage.removeAttribute('src');
    var back = currentTrigger;
    currentTrigger = null;
    if (back && back.focus) back.focus({ preventScroll: true });
    playerIsOpen = false;
    syncHero();
  }

  if (canDialog) {
    document.addEventListener('click', function (e) {
      var trigger = e.target.closest ? e.target.closest('.js-play, .js-zoom') : null;
      if (!trigger) return;
      e.preventDefault();
      openPlayer(trigger);
    });
    dialog.querySelector('.player__close').addEventListener('click', function () { dialog.close(); });
    dialog.addEventListener('click', function (e) { if (e.target === dialog) dialog.close(); });
    dialog.addEventListener('close', resetPlayer);
    playerVideo.addEventListener('error', function () { if (playerVideo.getAttribute('src')) playerError.hidden = false; });
    playerImage.addEventListener('error', function () { if (playerImage.getAttribute('src')) playerError.hidden = false; });
  }
  /* Без поддержки <dialog> ссылки просто открывают файл ролика или изображения */

  /* ---------- Кадры и заголовки раскрываются при появлении ----------
     Наблюдаем за родителем, а не за самим элементом: скрытый через clip-path элемент
     браузер не считает видимым, и раскрытие не сработало бы. */

  if ('IntersectionObserver' in window && !reduceMotion) {
    root.classList.add('reveal');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.05 });
    each(document.querySelectorAll('.shot, .stills'), function (el) { io.observe(el); });

    var titleIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var t = e.target.querySelector('.title');
        if (t) t.classList.add('is-in');
        titleIo.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0 });
    each(document.querySelectorAll('.title'), function (t) { titleIo.observe(t.parentElement); });
  }

  /* ---------- Плавающая кнопка связи (телефон) ---------- */

  var dock = document.querySelector('.dock');
  var heroActions = document.querySelector('.hero__actions');
  if (dock && heroActions && contactEl && 'IntersectionObserver' in window) {
    var seen = { hero: true, contact: false };
    var dockLink = dock.querySelector('a');
    var updateDock = function () {
      var on = !seen.hero && !seen.contact;
      dock.classList.toggle('is-on', on);
      dock.setAttribute('aria-hidden', String(!on));
      if (on) dockLink.removeAttribute('tabindex'); else dockLink.setAttribute('tabindex', '-1');
    };
    new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { seen.hero = e.isIntersecting; });
      updateDock();
    }, { threshold: 0 }).observe(heroActions);
    new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { seen.contact = e.isIntersecting; });
      updateDock();
    }, { threshold: 0.25 }).observe(contactEl);
  }
  /* ---------- 3D-модель комплекса ----------
     Движок и модель (около 3 МБ) подгружаются отдельно: на компьютере — когда блок близко к экрану,
     на телефоне и в режиме экономии трафика — только по кнопке. Колесо мыши приближает модель
     после первого нажатия на неё, а до этого листает страницу. На телефоне вращение включается кнопкой. */

  var viewerEl = document.getElementById('viewer');
  if (viewerEl) (function () {
    var stage = viewerEl.querySelector('.viewer__stage');
    var startBtn = viewerEl.querySelector('.viewer__start');
    var lockBtn = viewerEl.querySelector('.viewer__lock');
    var api = null, loading = false, onScreen = false;
    var touch = !finePointer;

    viewerEl.classList.toggle('is-touch', touch);
    startBtn.hidden = false;

    function setState(s) { viewerEl.setAttribute('data-state', s); }
    function fail() { loading = false; setState('error'); }
    function loadScript(src, done) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = function () { done(true); };
      s.onerror = function () { done(false); };
      document.head.appendChild(s);
    }
    function pressOnly(selector, attr, value) {
      each(viewerEl.querySelectorAll(selector), function (b) {
        b.setAttribute('aria-pressed', String(b.getAttribute(attr) === value));
      });
    }
    function setTouch(on) {
      if (!api || !touch) return;
      api.setEnabled(on);
      viewerEl.classList.toggle('is-touch-on', on);
      lockBtn.setAttribute('aria-pressed', String(on));
    }

    function start(asked) {
      if (api || loading) return;
      loading = true; setState('loading');
      loadScript('model/viewer.js', function (ok) {
        if (!ok || !window.RainViewer) return fail();
        loadScript('model/complex.js', function (ok2) {
          var data = window.__RS_MODEL;
          if (!ok2 || !data) return fail();
          var view = window.RainViewer.mount(viewerEl.querySelector('.viewer__canvas'), {
            coarse: touch, still: reduceMotion,
            onInteract: function () { viewerEl.classList.add('is-used'); pressOnly('[data-view]', 'data-view', ''); }
          });
          if (!view) return fail();
          view.load(data.glb, data, function () {
            api = view; loading = false; window.__RS_MODEL = null;
            setState('ready');
            stage.tabIndex = 0;
            api.setVisible(onScreen);
            if (touch) setTouch(!!asked); else api.setInteractive(true, false);
          }, function () { view.dispose(); fail(); });
        });
      });
    }

    startBtn.addEventListener('click', function () { start(true); });
    lockBtn.addEventListener('click', function () { setTouch(!viewerEl.classList.contains('is-touch-on')); });

    // мышь: колесо приближает только после нажатия на модель и пока курсор над ней
    stage.addEventListener('pointerdown', function (e) {
      if (api && !touch && e.target.tagName === 'CANVAS') api.setInteractive(true, true);
    });
    stage.addEventListener('pointerleave', function () { if (api && !touch) api.setInteractive(true, false); });
    stage.addEventListener('contextmenu', function (e) { if (api && e.target.tagName === 'CANVAS') e.preventDefault(); });

    viewerEl.addEventListener('click', function (e) {
      if (!api || !e.target.closest) return;
      var b = e.target.closest('button');
      if (!b) return;
      if (b.hasAttribute('data-view')) {
        api.setView(b.getAttribute('data-view'), reduceMotion ? 0 : 900);
        pressOnly('[data-view]', 'data-view', b.getAttribute('data-view'));
      } else if (b.hasAttribute('data-mode')) {
        api.setMode(b.getAttribute('data-mode'));
        pressOnly('[data-mode]', 'data-mode', b.getAttribute('data-mode'));
      } else if (b.hasAttribute('data-zoom')) {
        api.zoom(b.getAttribute('data-zoom') === 'in' ? 0.72 : 1.39);
        viewerEl.classList.add('is-used');
      }
    });

    stage.addEventListener('keydown', function (e) {
      if (!api || e.target !== stage) return;
      var k = e.key, used = true;
      if (k === 'ArrowLeft') api.orbit(-0.14, 0);
      else if (k === 'ArrowRight') api.orbit(0.14, 0);
      else if (k === 'ArrowUp') api.orbit(0, -0.09);
      else if (k === 'ArrowDown') api.orbit(0, 0.09);
      else if (k === '+' || k === '=') api.zoom(0.8);
      else if (k === '-' || k === '_') api.zoom(1.25);
      else used = false;
      if (used) { e.preventDefault(); viewerEl.classList.add('is-used'); pressOnly('[data-view]', 'data-view', ''); }
    });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          onScreen = e.isIntersecting;
          if (api) { api.setVisible(onScreen); if (!onScreen) setTouch(false); }
        });
      }, { threshold: 0 }).observe(stage);
      if (!touch && !saveData) {
        var near = new IntersectionObserver(function (entries) {
          entries.forEach(function (e) { if (e.isIntersecting) { near.disconnect(); start(false); } });
        }, { rootMargin: '500px 0px' });
        near.observe(stage);
      }
    } else { onScreen = true; }

    window.__rsViewer = function () { return api; };
  })();
})();
