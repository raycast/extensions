(() => {
  "use strict";

  const PRODUCT_NAME = "Cloakshot";
  // PDF fonts and source bytes can be needed long after the first render.
  const heartbeat = setInterval(() => fetch("./ping").catch(() => undefined), 60_000);
  window.addEventListener("pagehide", () => clearInterval(heartbeat), { once: true });
  const PDF_RENDER_SCALE = 150 / 72;
  const PDF_WATERMARK_HEIGHT_PT = 18;
  const PDF_WATERMARK_RENDER_SCALE = 4;
  const OCR_MIN_CONFIDENCE = 35;
  // Page entries that can carry comments, form values, scripts or hidden data.
  const PAGE_EXTRAS = ["Annots", "AA", "Metadata", "PieceInfo", "Thumb", "B"];

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const imageCanvas = $("#imageCanvas");
  const overlayCanvas = $("#overlayCanvas");
  const imageContext = imageCanvas.getContext("2d");
  const overlayContext = overlayCanvas.getContext("2d");
  const mosaicCache = new WeakMap();

  const state = {
    filename: "image.png",
    kind: "image",
    entitlement: { plan: "free", canExport: false },
    upgradeUrl: "",
    priceLabel: "",
    pages: [],
    pageIndex: 0,
    pdf: null,
    pdfBytes: null,
    draft: null,
    start: null,
    drawing: false,
    tool: "rectangle",
    effect: "mosaic",
    mosaicSize: 14,
    blurSize: 18,
    solidColor: "#111827",
    brushSize: 36,
    zoom: 1
  };

  const currentPage = () => state.pages[state.pageIndex];
  const hasWatermark = () => state.entitlement.plan !== "pro";

  start().catch((error) => {
    $("#loading").textContent = `Could not load ${state.kind === "pdf" ? "PDF" : "image"}: ${error.message || error}`;
  });

  async function start() {
    const config = await fetch("./config").then((response) => response.json());
    Object.assign(state, {
      filename: config.filename,
      kind: config.kind,
      entitlement: config.entitlement,
      upgradeUrl: config.upgradeUrl,
      priceLabel: config.priceLabel
    });
    $("#filename").textContent = config.filename;

    if (state.kind === "pdf") await loadPdf();
    else state.pages = [newPage(imageToCanvas(await loadImage("./source")))];

    configureForKind();
    bindControls();
    updatePlanBadge();
    await showPage(0);
  }

  function newPage(source, details = {}) {
    return { source, masks: [], history: [], redo: [], crop: null, words: [], ...details };
  }

  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("The browser cannot decode this image format."));
      image.src = url;
    });
  }

  function imageToCanvas(image) {
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    canvas.getContext("2d").drawImage(image, 0, 0);
    return canvas;
  }

  async function loadPdf() {
    const [pdfjs, bytes] = await Promise.all([
      import("./vendor/pdf.min.mjs"),
      fetch("./source").then((response) => {
        if (!response.ok) throw new Error("The PDF could not be read.");
        return response.arrayBuffer();
      }),
      loadScript("./vendor/pdf-lib.min.js")
    ]);
    pdfjs.GlobalWorkerOptions.workerSrc = vendorUrl("pdf.worker.min.mjs");
    state.pdfBytes = bytes;
    // pdf.js hands the buffer it receives to its worker, which empties it, so it
    // gets a copy and the original bytes stay available for export.
    state.pdf = await pdfjs.getDocument({
      data: bytes.slice(0),
      wasmUrl: vendorUrl("pdfjs-wasm/"),
      standardFontDataUrl: vendorUrl("pdfjs-standard-fonts/"),
      cMapUrl: vendorUrl("pdfjs-cmaps/"),
      iccUrl: vendorUrl("pdfjs-iccs/"),
      isEvalSupported: false
    }).promise;

    const pageNumbers = Array.from({ length: state.pdf.numPages }, (_, index) => index + 1);
    state.pages = await Promise.all(pageNumbers.map(async (pageNumber) => {
      const page = await state.pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1 });
      return newPage(null, { widthPt: viewport.width, heightPt: viewport.height, rotated: page.rotate % 360 !== 0 });
    }));
  }

  function vendorUrl(path) {
    return new URL(`./vendor/${path}`, location.href).href;
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Could not load ${src}`));
      document.head.append(script);
    });
  }

  async function renderPdfPage(index) {
    const page = await state.pdf.getPage(index + 1);
    const viewport = page.getViewport({ scale: PDF_RENDER_SCALE });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    await page.render({ canvas, viewport, background: "#ffffff" }).promise;
    return canvas;
  }

  function pageSource(index) {
    const page = state.pages[index];
    if (page.source) return Promise.resolve(page.source);
    page.sourcePromise ??= renderPdfPage(index).then((canvas) => {
      page.source = canvas;
      return canvas;
    });
    return page.sourcePromise;
  }

  function configureForKind() {
    const isPdf = state.kind === "pdf";
    $("#cropTool").hidden = isPdf;
    document.title = `${state.filename} — ${PRODUCT_NAME}`;
    $("#frameControls").hidden = isPdf;
    $("#copyButton").hidden = isPdf;
    $("#searchableToggle").hidden = !isPdf;
    $("#pagesSection").hidden = !isPdf;
    $("#pageNav").hidden = !isPdf;
    $("#loadingLabel").textContent = isPdf ? "Rendering page…" : "Loading original…";
    if (isPdf) {
      state.solidColor = "#000000";
      $("#solidColor").value = state.solidColor;
      setEffect("solid");
      renderPageList();
    }
  }

  async function showPage(index) {
    state.pageIndex = index;
    state.draft = null;
    state.start = null;
    state.drawing = false;
    updatePageControls();
    if (!currentPage().source) {
      $("#loading").hidden = false;
      $("#framePreview").hidden = true;
    }
    try {
      await pageSource(index);
    } catch (error) {
      $("#loading").hidden = false;
      $("#loadingLabel").textContent = `Could not render page ${index + 1}: ${error.message || error}`;
      return;
    }
    if (state.pageIndex === index) setupCanvas();
  }

  function setupCanvas(fitView = true) {
    const { width, height } = visibleBounds();
    for (const canvas of [imageCanvas, overlayCanvas]) {
      canvas.width = width;
      canvas.height = height;
    }
    $("#dimensions").textContent = state.kind === "pdf" ? `Page ${state.pageIndex + 1} of ${state.pages.length}` : `${width} × ${height}px`;
    $("#loading").hidden = true;
    $("#framePreview").hidden = false;
    if (fitView) fitCanvas();
    else setZoom(state.zoom);
    render();
  }

  function bindControls() {
    $$(".tool").forEach((button) => {
      button.addEventListener("click", () => setTool(button.dataset.tool));
      button.addEventListener("keydown", toolKeyboard);
    });
    $("#effect").addEventListener("change", (event) => setEffect(event.target.value));
    bindRange("#mosaicSize", "#mosaicValue", (value) => {
      state.mosaicSize = value;
      state.pages.forEach((page) => {
        [...page.masks, ...page.history.flatMap((entry) => entry.masks), ...page.redo.flatMap((entry) => entry.masks)].forEach((mask) => {
          if (mask.effect === "mosaic") mask.mosaicSize = value;
        });
      });
      if (state.draft?.effect === "mosaic") state.draft.mosaicSize = value;
      render();
    });
    bindRange("#blurSize", "#blurValue", (value) => { state.blurSize = value; render(); });
    bindRange("#brushSize", "#brushValue", (value) => { state.brushSize = value; });
    $("#solidColor").addEventListener("input", (event) => { state.solidColor = event.target.value; render(); });

    overlayCanvas.addEventListener("pointerdown", pointerDown);
    overlayCanvas.addEventListener("pointermove", pointerMove);
    overlayCanvas.addEventListener("pointerup", pointerUp);
    overlayCanvas.addEventListener("pointercancel", cancelSelection);
    $("#applyCropButton").addEventListener("click", applyCrop);
    $("#cancelCropButton").addEventListener("click", () => setTool("rectangle"));
    $("#resetCropButton").addEventListener("click", resetCrop);
    $("#undoButton").addEventListener("click", undo);
    $("#redoButton").addEventListener("click", redo);
    $("#clearButton").addEventListener("click", clearAll);
    $("#detectTextButton").addEventListener("click", detectText);
    $("#saveButton").addEventListener("click", saveOutput);
    $("#copyButton").addEventListener("click", copyOutput);
    $("#framedOutput").addEventListener("change", updateFrameControls);
    $("#frameStyle").addEventListener("change", updateFramePreview);
    $("#zoomIn").addEventListener("click", () => setZoom(state.zoom + .1));
    $("#zoomOut").addEventListener("click", () => setZoom(state.zoom - .1));
    $("#fitButton").addEventListener("click", fitCanvas);
    $("#prevPage").addEventListener("click", () => changePage(-1));
    $("#nextPage").addEventListener("click", () => changePage(1));
    $("#planBadge").addEventListener("click", () => openUpgradeDialog());
    window.addEventListener("resize", () => { if (state.zoom < 1) fitCanvas(); });
    window.addEventListener("keydown", keyboardShortcuts);
    window.addEventListener("paste", pasteImage);
    updateFrameControls();
  }

  function bindRange(inputSelector, outputSelector, onInput) {
    const input = $(inputSelector);
    const updateTrack = () => input.style.setProperty("--range-fill", `${(Number(input.value) - Number(input.min)) / (Number(input.max) - Number(input.min)) * 100}%`);
    updateTrack();
    input.addEventListener("input", (event) => {
      const value = Number(event.target.value);
      updateTrack();
      $(outputSelector).textContent = `${value} px`;
      onInput(value);
    });
  }

  function setEffect(effect) {
    state.effect = effect;
    $("#effect").value = effect;
    $("#mosaicOptions").hidden = effect !== "mosaic";
    $("#blurOptions").hidden = effect !== "blur";
    $("#solidOptions").hidden = effect !== "solid";
  }

  function setTool(tool) {
    if (tool === "crop" && state.kind !== "image") return;
    cancelSelection();
    state.tool = tool;
    $$(".tool").forEach((button) => {
      const active = button.dataset.tool === tool;
      button.classList.toggle("active", active);
      button.setAttribute("aria-checked", String(active));
      button.tabIndex = active ? 0 : -1;
    });
    $("#paintOptions").hidden = tool !== "paint";
    $("#cropControls").hidden = tool !== "crop";
    updateCropControls();
    drawOverlay();
  }

  function toolKeyboard(event) {
    const keys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    const tools = $$(".tool").filter((button) => !button.hidden);
    const index = tools.indexOf(event.currentTarget);
    const next = event.key === "Home" ? 0 : event.key === "End" ? tools.length - 1
      : (index + (event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1) + tools.length) % tools.length;
    setTool(tools[next].dataset.tool);
    tools[next].focus();
  }

  function changePage(step) {
    const index = clamp(state.pageIndex + step, 0, state.pages.length - 1);
    if (index !== state.pageIndex) void showPage(index);
  }

  function updatePageControls() {
    if (state.kind !== "pdf") return;
    $("#pageValue").textContent = `${state.pageIndex + 1} / ${state.pages.length}`;
    $("#prevPage").disabled = state.pageIndex === 0;
    $("#nextPage").disabled = state.pageIndex === state.pages.length - 1;
    $$(".page-item").forEach((item, index) => {
      item.classList.toggle("active", index === state.pageIndex);
      item.setAttribute("aria-current", index === state.pageIndex ? "page" : "false");
    });
    $$(".page-item")[state.pageIndex]?.scrollIntoView({ block: "nearest" });
  }

  function renderPageList() {
    $("#pageList").replaceChildren(...state.pages.map((page, index) => {
      const item = document.createElement("li");
      const button = document.createElement("button");
      const label = document.createElement("span");
      const count = document.createElement("span");
      button.className = "page-item";
      label.textContent = `Page ${index + 1}`;
      count.className = "page-count";
      button.append(label, count);
      button.addEventListener("click", () => void showPage(index));
      item.append(button);
      return item;
    }));
    state.pages.forEach((_, index) => updatePageCount(index));
  }

  function updatePageCount(index) {
    const count = $$(".page-count")[index];
    if (!count) return;
    const total = state.pages[index].masks.length;
    count.textContent = total ? String(total) : "";
    count.hidden = !total;
  }

  function pointerDown(event) {
    if (event.button !== 0 || !currentPage()?.source) return;
    overlayCanvas.setPointerCapture(event.pointerId);
    state.drawing = true;
    state.start = canvasPoint(event);
    if (state.tool === "paint" || state.tool === "freeform") {
      state.draft = makeMask("path", { points: [state.start], closed: state.tool === "freeform", width: state.brushSize });
    } else {
      state.draft = makeMask("rect", { x: state.start.x, y: state.start.y, width: 0, height: 0, ellipse: state.tool === "circle", selection: state.tool === "text" });
    }
    updateCropControls();
    drawOverlay();
  }

  function pointerMove(event) {
    if (!state.drawing || !state.draft) return;
    const point = canvasPoint(event);
    if (state.draft.type === "path") {
      const previous = state.draft.points[state.draft.points.length - 1];
      if (Math.hypot(point.x - previous.x, point.y - previous.y) > 2 / state.zoom) state.draft.points.push(point);
    } else {
      state.draft.width = point.x - state.start.x;
      state.draft.height = point.y - state.start.y;
    }
    updateCropControls();
    drawOverlay();
  }

  function pointerUp(event) {
    if (!state.drawing || !state.draft) return;
    state.drawing = false;
    if (overlayCanvas.hasPointerCapture(event.pointerId)) overlayCanvas.releasePointerCapture(event.pointerId);

    if (state.tool === "crop") {
      state.draft = cropBounds(state.draft, visibleBounds());
      state.start = null;
      updateCropControls();
      drawOverlay();
      return;
    }
    const { words } = currentPage();
    if (state.tool === "text") {
      const selection = normalizedRect(state.draft);
      const selected = words.filter((word) => intersects(selection, word));
      if (selected.length) {
        selected.forEach((word) => addMask(makeMask("rect", { ...word, ellipse: false })));
        toast(`${selected.length} text region${selected.length === 1 ? "" : "s"} redacted`);
      } else {
        toast(words.length ? "No detected text in that area" : "Run Detect Text first");
      }
    } else if (validDraft(state.draft)) {
      if (state.draft.type === "rect") Object.assign(state.draft, normalizedRect(state.draft));
      addMask(state.draft);
    }
    state.draft = null;
    state.start = null;
    render();
  }

  function makeMask(type, values) {
    return {
      type,
      effect: state.effect,
      mosaicSize: state.mosaicSize,
      blurSize: state.blurSize,
      color: state.solidColor,
      ...values
    };
  }

  function addMask(mask) {
    const page = currentPage();
    rememberEdit(page);
    page.masks.push(mask);
    updateHistory();
  }

  function validDraft(mask) {
    if (mask.type === "path") return mask.points.length > 1;
    return Math.abs(mask.width) > 3 && Math.abs(mask.height) > 3;
  }

  function canvasPoint(event) {
    const rect = overlayCanvas.getBoundingClientRect();
    return {
      x: visibleBounds().x + clamp((event.clientX - rect.left) * (overlayCanvas.width / rect.width), 0, overlayCanvas.width),
      y: visibleBounds().y + clamp((event.clientY - rect.top) * (overlayCanvas.height / rect.height), 0, overlayCanvas.height)
    };
  }

  function normalizedRect(rect) {
    return {
      x: rect.width < 0 ? rect.x + rect.width : rect.x,
      y: rect.height < 0 ? rect.y + rect.height : rect.y,
      width: Math.abs(rect.width),
      height: Math.abs(rect.height)
    };
  }

  function maskBounds(mask) {
    if (mask.type === "rect") return normalizedRect(mask);
    const xs = mask.points.map((point) => point.x);
    const ys = mask.points.map((point) => point.y);
    const reach = mask.closed ? 0 : mask.width / 2;
    const x = Math.min(...xs) - reach;
    const y = Math.min(...ys) - reach;
    return { x, y, width: Math.max(...xs) + reach - x, height: Math.max(...ys) + reach - y };
  }

  function intersects(a, b) {
    return a.x <= b.x + b.width && a.x + a.width >= b.x && a.y <= b.y + b.height && a.y + a.height >= b.y;
  }

  function render() {
    const page = currentPage();
    if (!page?.source) return;
    imageContext.clearRect(0, 0, imageCanvas.width, imageCanvas.height);
    imageContext.save();
    const bounds = visibleBounds();
    imageContext.translate(-bounds.x, -bounds.y);
    imageContext.drawImage(page.source, 0, 0);
    page.masks.forEach((mask) => applyMask(imageContext, mask, page.source));
    imageContext.restore();
    drawOverlay();
    updateHistory();
  }

  function applyMask(context, mask, source) {
    if (mask.type === "path" && !mask.closed) {
      const layer = document.createElement("canvas");
      layer.width = source.width;
      layer.height = source.height;
      const layerContext = layer.getContext("2d");
      drawEffect(layerContext, mask, source);
      layerContext.globalCompositeOperation = "destination-in";
      layerContext.strokeStyle = "#000";
      layerContext.lineCap = "round";
      layerContext.lineJoin = "round";
      layerContext.lineWidth = mask.width;
      maskPath(layerContext, mask);
      layerContext.stroke();
      context.drawImage(layer, 0, 0);
      return;
    }

    context.save();
    maskPath(context, mask);
    context.clip();
    drawEffect(context, mask, source);
    context.restore();
  }

  function drawEffect(context, mask, source) {
    if (mask.effect === "solid") {
      context.fillStyle = mask.color;
      context.fillRect(0, 0, source.width, source.height);
    } else if (mask.effect === "blur") {
      context.filter = `blur(${mask.blurSize}px)`;
      context.drawImage(source, 0, 0);
      context.filter = "none";
    } else {
      context.imageSmoothingEnabled = false;
      context.drawImage(getMosaic(source, mask.mosaicSize), 0, 0, source.width, source.height);
    }
  }

  function getMosaic(source, size) {
    if (!mosaicCache.has(source)) mosaicCache.set(source, new Map());
    const cache = mosaicCache.get(source);
    if (cache.has(size)) return cache.get(size);
    const tiny = document.createElement("canvas");
    tiny.width = Math.max(1, Math.ceil(source.width / size));
    tiny.height = Math.max(1, Math.ceil(source.height / size));
    const context = tiny.getContext("2d");
    context.imageSmoothingEnabled = true;
    context.drawImage(source, 0, 0, tiny.width, tiny.height);
    cache.set(size, tiny);
    return tiny;
  }

  function maskPath(context, mask) {
    context.beginPath();
    if (mask.type === "rect") {
      if (mask.ellipse) context.ellipse(mask.x + mask.width / 2, mask.y + mask.height / 2, Math.abs(mask.width / 2), Math.abs(mask.height / 2), 0, 0, Math.PI * 2);
      else context.rect(mask.x, mask.y, mask.width, mask.height);
    } else if (mask.points.length) {
      context.moveTo(mask.points[0].x, mask.points[0].y);
      mask.points.slice(1).forEach((point) => context.lineTo(point.x, point.y));
      if (mask.closed) context.closePath();
    }
  }

  function drawOverlay() {
    overlayContext.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    const page = currentPage();
    if (!page) return;
    overlayContext.save();
    const bounds = visibleBounds();
    overlayContext.translate(-bounds.x, -bounds.y);
    if (state.tool === "crop") {
      const crop = state.draft && cropBounds(state.draft, bounds);
      overlayContext.fillStyle = "rgba(0, 0, 0, .55)";
      overlayContext.beginPath();
      overlayContext.rect(bounds.x, bounds.y, bounds.width, bounds.height);
      if (crop) overlayContext.rect(crop.x, crop.y, crop.width, crop.height);
      overlayContext.fill("evenodd");
      if (crop) {
        overlayContext.strokeStyle = "#9b87ff";
        overlayContext.lineWidth = 2 / state.zoom;
        overlayContext.strokeRect(crop.x, crop.y, crop.width, crop.height);
      }
      overlayContext.restore();
      return;
    }
    if (state.tool === "text") {
      overlayContext.save();
      overlayContext.fillStyle = "rgba(124, 92, 255, .13)";
      overlayContext.strokeStyle = "rgba(155, 135, 255, .72)";
      overlayContext.lineWidth = Math.max(1, 1.2 / state.zoom);
      page.words.forEach((word) => {
        overlayContext.fillRect(word.x, word.y, word.width, word.height);
        overlayContext.strokeRect(word.x, word.y, word.width, word.height);
      });
      overlayContext.restore();
    }
    [...page.masks, ...(state.draft ? [state.draft] : [])].forEach((mask, index, all) => {
      overlayContext.save();
      overlayContext.strokeStyle = mask.selection ? "#9b87ff" : "#ff5874";
      overlayContext.fillStyle = mask.selection ? "rgba(124,92,255,.12)" : "rgba(255,88,116,.08)";
      overlayContext.lineWidth = Math.max(1.5, 2 / state.zoom);
      overlayContext.setLineDash([7 / state.zoom, 5 / state.zoom]);
      maskPath(overlayContext, mask);
      if (mask.type === "rect" || mask.closed) {
        overlayContext.fill();
        overlayContext.stroke();
      } else {
        overlayContext.setLineDash([]);
        overlayContext.globalAlpha = index === all.length - 1 && state.draft ? .55 : .28;
        overlayContext.lineCap = "round";
        overlayContext.lineJoin = "round";
        overlayContext.lineWidth = mask.width;
        overlayContext.stroke();
      }
      overlayContext.restore();
    });
    overlayContext.restore();
  }

  function visibleBounds() {
    const page = currentPage();
    return page.crop || { x: 0, y: 0, width: page.source.width, height: page.source.height };
  }

  function cropBounds(selection, bounds) {
    const rect = normalizedRect(selection);
    const x = clamp(Math.floor(rect.x), bounds.x, bounds.x + bounds.width);
    const y = clamp(Math.floor(rect.y), bounds.y, bounds.y + bounds.height);
    const right = clamp(Math.ceil(rect.x + rect.width), x, bounds.x + bounds.width);
    const bottom = clamp(Math.ceil(rect.y + rect.height), y, bounds.y + bounds.height);
    return { x, y, width: right - x, height: bottom - y };
  }

  function cancelSelection() {
    state.draft = null;
    state.start = null;
    state.drawing = false;
    updateCropControls();
    drawOverlay();
  }

  function updateCropControls() {
    const crop = state.tool === "crop" && state.draft && cropBounds(state.draft, visibleBounds());
    $("#applyCropButton").disabled = !crop || crop.width < 1 || crop.height < 1 || state.drawing;
    $("#resetCropButton").hidden = !currentPage()?.crop;
    $("#cropSize").textContent = crop && crop.width > 0 && crop.height > 0
      ? `${crop.width} × ${crop.height}px` : "Drag to select the area to keep";
  }

  function snapshot(page) {
    return { masks: [...page.masks], crop: page.crop && { ...page.crop } };
  }

  function rememberEdit(page) {
    page.history.push(snapshot(page));
    page.redo = [];
  }

  function applyCrop() {
    if (state.tool !== "crop" || !state.draft || state.drawing) return;
    const bounds = cropBounds(state.draft, visibleBounds());
    if (bounds.width < 1 || bounds.height < 1) return;
    const page = currentPage();
    rememberEdit(page);
    page.crop = bounds;
    setTool("rectangle");
    setupCanvas();
    toast("Image cropped");
  }

  function resetCrop() {
    const page = currentPage();
    if (!page.crop) return;
    rememberEdit(page);
    page.crop = null;
    cancelSelection();
    setupCanvas();
  }

  function undo() {
    const page = currentPage();
    if (!page.history.length) return;
    page.redo.push(snapshot(page));
    Object.assign(page, page.history.pop());
    cancelSelection();
    setupCanvas(false);
  }

  function redo() {
    const page = currentPage();
    if (!page.redo.length) return;
    page.history.push(snapshot(page));
    Object.assign(page, page.redo.pop());
    cancelSelection();
    setupCanvas(false);
  }

  function clearAll() {
    const page = currentPage();
    const message = state.kind === "pdf" ? "Remove every redaction on this page?" : "Remove every redaction?";
    if (!page.masks.length || !confirm(message)) return;
    rememberEdit(page);
    page.masks = [];
    render();
  }

  function updateHistory() {
    const page = currentPage();
    $("#undoButton").disabled = !page.history.length;
    $("#redoButton").disabled = !page.redo.length;
    $("#clearButton").disabled = !page.masks.length;
    const total = state.pages.reduce((sum, item) => sum + item.masks.length, 0);
    const pagesWithMasks = state.pages.filter((item) => item.masks.length).length;
    $("#maskCount").textContent = state.kind === "pdf"
      ? `${total} redaction${total === 1 ? "" : "s"} on ${pagesWithMasks} page${pagesWithMasks === 1 ? "" : "s"}`
      : `${total} redaction${total === 1 ? "" : "s"}`;
    updatePageCount(state.pageIndex);
    updateCropControls();
  }

  async function detectText() {
    const button = $("#detectTextButton");
    const progress = $("#ocrProgress");
    const page = currentPage();
    if (!window.Tesseract) {
      toast("Text detector could not load. Check your internet connection.");
      return;
    }
    button.disabled = true;
    progress.hidden = false;
    try {
      const result = await window.Tesseract.recognize(page.source, "eng", {
        logger(message) {
          if (typeof message.progress === "number") $("#ocrProgressBar").style.width = `${Math.round(message.progress * 100)}%`;
          $("#ocrStatus").textContent = sentenceCase(message.status || "Detecting text…");
        }
      });
      page.words = (result.data.words || []).filter((word) => word.confidence > OCR_MIN_CONFIDENCE).map(wordBox);
      if (page === currentPage()) setTool("text");
      toast(`Detected ${page.words.length} text region${page.words.length === 1 ? "" : "s"}`);
    } catch (error) {
      toast(`Text detection failed: ${error.message || error}`);
    } finally {
      button.disabled = false;
      progress.hidden = true;
      $("#ocrProgressBar").style.width = "0";
    }
  }

  function wordBox(word) {
    return {
      x: word.bbox.x0,
      y: word.bbox.y0,
      width: word.bbox.x1 - word.bbox.x0,
      height: word.bbox.y1 - word.bbox.y0,
      text: word.text
    };
  }

  function ensureCanExport() {
    const { entitlement } = state;
    if (entitlement.plan === "pro" || entitlement.canExport) return true;
    openUpgradeDialog(entitlement.lockReason);
    return false;
  }

  async function saveOutput() {
    if (state.kind === "pdf") return savePdf();
    if (!ensureCanExport()) return;
    const framed = $("#framedOutput").checked;
    try {
      const blob = await canvasBlob(exportImageCanvas(framed));
      downloadBlob(blob, outputName(framed ? "redacted-framed" : "redacted", "png"));
      toast("New PNG saved — original unchanged");
    } catch (error) {
      toast(`Could not save PNG: ${error.message || error}`);
    }
  }

  async function copyOutput() {
    if (!ensureCanExport()) return;
    try {
      const framed = $("#framedOutput").checked;
      const blob = await canvasBlob(exportImageCanvas(framed));
      if (!navigator.clipboard?.write || !window.ClipboardItem) throw new Error("Clipboard image access is unavailable in this browser");
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      toast(`${framed ? "Framed" : "Redacted"} PNG copied`);
    } catch (error) {
      toast(`${error.message || error}. Use Save PNG instead.`);
    }
  }

  function exportImageCanvas(framed) {
    if (!framed && !hasWatermark()) return imageCanvas;
    const canvas = framed ? createFramedCanvas() : cloneCanvas(imageCanvas);
    if (hasWatermark()) stampWatermark(canvas);
    return canvas;
  }

  async function savePdf() {
    if (!ensureCanExport()) return;
    const button = $("#saveButton");
    button.disabled = true;
    try {
      const blob = await buildRedactedPdf((index) => {
        button.textContent = `Saving ${index + 1} / ${state.pages.length}…`;
      });
      downloadBlob(blob, outputName("redacted", "pdf"));
      toast("New PDF saved — original unchanged");
    } catch (error) {
      toast(`Could not save PDF: ${error.message || error}`);
    } finally {
      button.disabled = false;
      updateExportControls();
    }
  }

  /**
   * Builds a new PDF rather than editing the original. Pages with redactions are
   * flattened to images so the covered text is gone, not just hidden. Untouched
   * pages are copied as-is so their text stays sharp and selectable. Document
   * metadata, attachments, scripts and earlier revisions are never copied.
   */
  async function buildRedactedPdf(onPage) {
    const { PDFDocument, PDFName, StandardFonts } = window.PDFLib;
    const original = await PDFDocument.load(state.pdfBytes, { ignoreEncryption: true, updateMetadata: false });
    const output = await PDFDocument.create();
    const searchable = $("#searchableOutput").checked;
    const watermark = hasWatermark()
      ? await output.embedPng(await canvasBytes(createWatermarkBadge(PDF_WATERMARK_HEIGHT_PT * PDF_WATERMARK_RENDER_SCALE)))
      : null;
    let font;
    let ocrWorker;

    try {
      for (const [index, page] of state.pages.entries()) {
        onPage(index);
        // Encrypted content cannot be copied as readable data, and a rotated page
        // would turn the watermark sideways, so both are flattened as well.
        const flatten = page.masks.length > 0 || original.isEncrypted || Boolean(watermark && page.rotated);
        let target;
        if (flatten) {
          const flattened = await flattenPage(page, index);
          const image = await output.embedPng(await canvasBytes(flattened));
          target = output.addPage([page.widthPt, page.heightPt]);
          target.drawImage(image, { x: 0, y: 0, width: page.widthPt, height: page.heightPt });
          if (searchable) {
            font ??= await output.embedFont(StandardFonts.Helvetica);
            ocrWorker ??= await createOcrWorker();
            await addSearchableText(target, flattened, page, font, ocrWorker);
          }
        } else {
          // Extras are removed before copying because pdf-lib writes every copied
          // object to the file, even ones no page refers to any more.
          const originalPage = original.getPage(index);
          PAGE_EXTRAS.forEach((key) => originalPage.node.delete(PDFName.of(key)));
          const [copy] = await output.copyPages(original, [index]);
          target = output.addPage(copy);
        }
        if (watermark) stampPdfWatermark(target, watermark);
      }
    } finally {
      await ocrWorker?.terminate();
    }

    output.setProducer(PRODUCT_NAME);
    output.setCreator(PRODUCT_NAME);
    return new Blob([await output.save()], { type: "application/pdf" });
  }

  async function flattenPage(page, index) {
    const source = page.source ?? await renderPdfPage(index);
    const flattened = cloneCanvas(source);
    const context = flattened.getContext("2d");
    page.masks.forEach((mask) => applyMask(context, mask, source));
    return flattened;
  }

  async function createOcrWorker() {
    if (!window.Tesseract) throw new Error("Searchable text needs the text detector, which could not load. Turn off Searchable and try again.");
    return window.Tesseract.createWorker("eng");
  }

  async function addSearchableText(target, canvas, page, font, worker) {
    const { data } = await worker.recognize(canvas);
    const scale = page.widthPt / canvas.width;
    const redacted = page.masks.map(maskBounds);
    for (const word of data.words || []) {
      const box = wordBox(word);
      const text = box.text.trim();
      // Words touching a redaction are skipped so OCR can never turn a light blur
      // back into selectable text.
      if (!text || word.confidence <= OCR_MIN_CONFIDENCE || redacted.some((bounds) => intersects(bounds, box))) continue;
      try {
        const size = (box.width * scale) / font.widthOfTextAtSize(text, 1);
        if (!Number.isFinite(size) || size <= 0) continue;
        target.drawText(text, { x: box.x * scale, y: page.heightPt - (box.y + box.height) * scale, size, font, opacity: 0 });
      } catch {
        // The built-in PDF font cannot encode every character; those words stay unsearchable.
      }
    }
  }

  function stampPdfWatermark(target, image) {
    const height = PDF_WATERMARK_HEIGHT_PT;
    const width = image.width * (height / image.height);
    const margin = height * .5;
    const box = target.getCropBox();
    target.drawImage(image, { x: box.x + box.width - width - margin, y: box.y + margin, width, height });
  }

  function stampWatermark(canvas) {
    const height = Math.round(clamp(Math.min(canvas.width, canvas.height) * .045, 22, 64));
    const badge = createWatermarkBadge(height);
    const margin = Math.round(height * .5);
    canvas.getContext("2d").drawImage(badge, canvas.width - badge.width - margin, canvas.height - badge.height - margin);
  }

  function createWatermarkBadge(height) {
    const label = `Redacted with ${PRODUCT_NAME}`;
    const font = `600 ${Math.round(height * .4)}px "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    const padding = height * .3;
    const markSize = height * .6;
    const gap = height * .24;
    const measure = document.createElement("canvas").getContext("2d");
    measure.font = font;

    const badge = document.createElement("canvas");
    badge.width = Math.ceil(padding * 2 + markSize + gap + measure.measureText(label).width);
    badge.height = height;
    const context = badge.getContext("2d");
    context.fillStyle = "rgba(12, 12, 16, .74)";
    roundedRect(context, 0, 0, badge.width, height, height * .3);
    context.fill();
    drawLogoMark(context, padding, (height - markSize) / 2, markSize);
    context.font = font;
    context.fillStyle = "rgba(255, 255, 255, .94)";
    context.textBaseline = "middle";
    context.fillText(label, padding + markSize + gap, height / 2);
    return badge;
  }

  // Mirrors the SVG mark in editor.html on a 24-unit grid.
  function drawLogoMark(context, x, y, size) {
    context.save();
    context.translate(x, y);
    context.scale(size / 24, size / 24);
    const gradient = context.createLinearGradient(0, 0, 24, 24);
    gradient.addColorStop(0, "#7048e8");
    gradient.addColorStop(1, "#f03e6f");
    context.fillStyle = gradient;
    roundedRect(context, 0, 0, 24, 24, 6);
    context.fill();
    context.fillStyle = "#ffffff";
    roundedRect(context, 5, 6, 14, 2.5, 1.25);
    context.fill();
    roundedRect(context, 5, 15.5, 10, 2.5, 1.25);
    context.fill();
    context.fillStyle = "#0b0b0f";
    roundedRect(context, 5, 10.25, 14, 3.5, 1);
    context.fill();
    context.restore();
  }

  function createFramedCanvas() {
    const padding = framePadding();
    const frame = document.createElement("canvas");
    frame.width = imageCanvas.width + padding * 2;
    frame.height = imageCanvas.height + padding * 2;
    const context = frame.getContext("2d");
    const gradient = context.createLinearGradient(0, 0, frame.width, frame.height);
    const colors = frameColors($("#frameStyle").value);
    gradient.addColorStop(0, colors[0]);
    gradient.addColorStop(1, colors[1]);
    context.fillStyle = gradient;
    context.fillRect(0, 0, frame.width, frame.height);

    const radius = frameRadius(padding);
    context.save();
    context.shadowColor = "rgba(0, 0, 0, .42)";
    context.shadowBlur = Math.max(22, padding * .38);
    context.shadowOffsetY = Math.max(8, padding * .12);
    roundedRect(context, padding, padding, imageCanvas.width, imageCanvas.height, radius);
    context.fillStyle = "#fff";
    context.fill();
    context.restore();
    context.save();
    roundedRect(context, padding, padding, imageCanvas.width, imageCanvas.height, radius);
    context.clip();
    context.drawImage(imageCanvas, padding, padding);
    context.restore();
    return frame;
  }

  function updateFrameControls() {
    $("#frameStyle").hidden = !$("#framedOutput").checked;
    updateExportControls();
    updateFramePreview();
    if (currentPage()?.source) fitCanvas();
  }

  function updateExportControls() {
    const framed = state.kind === "image" && $("#framedOutput").checked;
    const locked = state.entitlement.plan !== "pro" && !state.entitlement.canExport;
    $("#copyButton").textContent = framed ? "Copy Framed" : "Copy PNG";
    $("#saveButton").textContent = state.kind === "pdf" ? "Save PDF" : framed ? "Save Framed" : "Save PNG";
    for (const button of [$("#copyButton"), $("#saveButton")]) {
      button.classList.toggle("locked", locked);
      button.title = locked ? state.entitlement.lockReason : "";
    }
  }

  function updateFramePreview() {
    const preview = $("#framePreview");
    const framed = $("#framedOutput").checked;
    const colors = frameColors($("#frameStyle").value);
    preview.classList.toggle("framed", framed);
    preview.style.setProperty("--frame-background", `linear-gradient(to bottom right, ${colors[0]}, ${colors[1]})`);
  }

  function updatePlanBadge() {
    const badge = $("#planBadge");
    const { entitlement } = state;
    if (entitlement.plan === "pro") {
      badge.textContent = "Pro";
      badge.className = "plan-badge pro";
      badge.disabled = true;
      return;
    }
    badge.className = `plan-badge ${entitlement.canExport ? "free" : "locked"}`;
    badge.textContent = entitlement.canExport ? `Free · ${entitlement.remainingToday} left today` : "Export locked";
  }

  function openUpgradeDialog(reason) {
    const { entitlement } = state;
    $("#upgradeReason").textContent = reason
      || entitlement.lockReason
      || `Free exports include a small ${PRODUCT_NAME} watermark, with ${entitlement.dailyLimit} redactions a day.`;
    $("#upgradeLink").href = state.upgradeUrl;
    $("#upgradePrice").textContent = state.priceLabel;
    $("#upgradeDialog").showModal();
  }

  function framePadding() {
    return Math.max(72, Math.round(Math.min(imageCanvas.width, imageCanvas.height) * .09));
  }

  function frameRadius(padding) {
    return Math.max(12, Math.min(28, padding * .22));
  }

  function frameColors(style) {
    return {
      violet: ["#3b1d78", "#c6477b"],
      sunset: ["#ff7a59", "#682c91"],
      ocean: ["#075985", "#22d3ee"],
      graphite: ["#111827", "#475569"],
      paper: ["#e7e5e4", "#a8a29e"]
    }[style];
  }

  function roundedRect(context, x, y, width, height, radius) {
    context.beginPath();
    context.roundRect(x, y, width, height, radius);
  }

  function cloneCanvas(source) {
    const canvas = document.createElement("canvas");
    canvas.width = source.width;
    canvas.height = source.height;
    canvas.getContext("2d").drawImage(source, 0, 0);
    return canvas;
  }

  function canvasBlob(canvas) {
    return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("PNG encoding failed")), "image/png"));
  }

  async function canvasBytes(canvas) {
    return new Uint8Array(await (await canvasBlob(canvas)).arrayBuffer());
  }

  function downloadBlob(blob, filename) {
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 2_000);
  }

  function outputName(suffix, extension) {
    const base = state.filename.replace(/\.[^.]+$/, "") || "image";
    return `${base}_${suffix}.${extension}`;
  }

  function fitCanvas() {
    const viewport = $("#canvasViewport");
    const padding = $("#framedOutput").checked ? framePadding() * 2 : 0;
    const fit = Math.min(1, (viewport.clientWidth - 64) / (imageCanvas.width + padding), (viewport.clientHeight - 64) / (imageCanvas.height + padding));
    setZoom(fit);
  }

  function setZoom(value) {
    state.zoom = clamp(value, .1, 2);
    const stack = $("#canvasStack");
    stack.style.width = `${Math.round(imageCanvas.width * state.zoom)}px`;
    stack.style.height = `${Math.round(imageCanvas.height * state.zoom)}px`;
    const padding = framePadding();
    const preview = $("#framePreview");
    preview.style.setProperty("--frame-padding", `${Math.round(padding * state.zoom)}px`);
    preview.style.setProperty("--frame-radius", `${Math.round(frameRadius(padding) * state.zoom)}px`);
    $("#zoomValue").textContent = `${Math.round(state.zoom * 100)}%`;
    drawOverlay();
  }

  function keyboardShortcuts(event) {
    const modifier = event.metaKey || event.ctrlKey;
    if ($("#upgradeDialog").open) return;
    if (event.target?.matches("input, select, textarea, [contenteditable]")) return;
    if (modifier && event.key.toLowerCase() === "z") {
      event.preventDefault();
      event.shiftKey ? redo() : undo();
    } else if (modifier && event.key.toLowerCase() === "s") {
      event.preventDefault();
      void saveOutput();
    } else if (state.kind === "pdf" && (event.key === "PageDown" || event.key === "PageUp")) {
      event.preventDefault();
      changePage(event.key === "PageDown" ? 1 : -1);
    } else if (event.key === "Enter" && state.tool === "crop" && !event.target?.closest("button, a")) {
      event.preventDefault();
      applyCrop();
    } else if (event.key === "Escape" && state.tool === "crop") {
      setTool("rectangle");
    } else if (event.key === "Escape" && state.draft) {
      cancelSelection();
    }
  }

  async function pasteImage(event) {
    if (state.kind !== "image") return;
    const imageItem = [...(event.clipboardData?.items || [])].find((item) => item.type.startsWith("image/"));
    const imageFile = imageItem?.getAsFile()
      || [...(event.clipboardData?.files || [])].find((file) => file.type.startsWith("image/"));
    if (!imageFile) return;
    event.preventDefault();
    if (state.entitlement.plan !== "pro") {
      openUpgradeDialog(`On the free plan, open each image from Raycast so it counts toward your ${state.entitlement.dailyLimit} daily redactions. Pro can paste new images straight into the editor.`);
      return;
    }
    if (currentPage().masks.length && !confirm("Replace this image and discard its redactions?")) return;

    const url = URL.createObjectURL(imageFile);
    try {
      state.pages = [newPage(imageToCanvas(await loadImage(url)))];
      state.filename = imageFile.name || "clipboard-image.png";
      $("#filename").textContent = state.filename;
      await showPage(0);
      toast("Clipboard image loaded");
    } catch (error) {
      toast(error.message || String(error));
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  let toastTimer;
  function toast(message) {
    const element = $("#toast");
    element.textContent = message;
    element.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => element.classList.remove("show"), 3_200);
  }

  function sentenceCase(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }
})();
