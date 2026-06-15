export function generateDrawingPage(base64Image: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Simple Draw</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: #1a1a1a;
    color: #e0e0e0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    overflow: hidden;
    height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .toolbar {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 10px 16px;
    background: #2a2a2a;
    border-bottom: 1px solid #3a3a3a;
    flex-shrink: 0;
    flex-wrap: wrap;
  }

  .toolbar-group {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .toolbar-label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #888;
    margin-right: 2px;
  }

  .separator {
    width: 1px;
    height: 24px;
    background: #3a3a3a;
  }

  .color-swatch {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 2px solid transparent;
    cursor: pointer;
    transition: border-color 0.15s, transform 0.15s;
  }
  .color-swatch:hover { transform: scale(1.15); }
  .color-swatch.active { border-color: #fff; }

  input[type="color"] {
    width: 24px;
    height: 24px;
    border: none;
    border-radius: 50%;
    cursor: pointer;
    background: none;
    padding: 0;
  }
  input[type="color"]::-webkit-color-swatch-wrapper { padding: 0; }
  input[type="color"]::-webkit-color-swatch { border: 2px solid #555; border-radius: 50%; }

  .width-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 6px;
    border: 1px solid #444;
    background: #333;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
  }
  .width-btn:hover { background: #444; }
  .width-btn.active { border-color: #7c5cff; background: #3d3560; }
  .width-dot {
    border-radius: 50%;
    background: #e0e0e0;
  }

  .tool-btn {
    padding: 6px 14px;
    border-radius: 6px;
    border: 1px solid #444;
    background: #333;
    color: #e0e0e0;
    font-size: 13px;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
    white-space: nowrap;
  }
  .tool-btn:hover { background: #444; }
  .tool-btn.active { border-color: #7c5cff; background: #3d3560; color: #fff; }

  .action-btn {
    padding: 6px 14px;
    border-radius: 6px;
    border: 1px solid #444;
    background: #333;
    color: #e0e0e0;
    font-size: 13px;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
    white-space: nowrap;
  }
  .action-btn:hover { background: #444; }
  .action-btn.primary { background: #7c5cff; border-color: #7c5cff; color: #fff; }
  .action-btn.primary:hover { background: #6a4de0; }
  .action-btn.danger { border-color: #c0392b; color: #e74c3c; }
  .action-btn.danger:hover { background: #3a2020; }

  .spacer { flex: 1; }

  .canvas-container {
    flex: 1;
    overflow: visible;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #111;
    position: relative;
  }

  canvas {
    display: block;
    cursor: crosshair;
  }

  .text-overlay {
    position: absolute;
    pointer-events: none;
    z-index: 10;
    overflow: visible;
  }
  .text-overlay.active {
    pointer-events: auto;
  }
  .text-badge {
    position: absolute;
    display: inline-flex;
    align-items: center;
    cursor: move;
    user-select: none;
    transform-origin: center center;
  }
  .text-badge textarea {
    background: transparent;
    border: none;
    outline: none;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
    font-weight: 700;
    font-size: 24px;
    min-width: 10px;
    min-height: 1.3em;
    width: 10px;
    color: inherit;
    padding: 0;
    margin: 0;
    text-align: center;
    resize: none;
    overflow: hidden;
    line-height: 1.3;
    display: block;
    white-space: pre;
    word-break: keep-all;
    overflow-wrap: normal;
  }
  .text-badge .size-hint {
    position: absolute;
    bottom: -20px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 10px;
    color: #aaa;
    white-space: nowrap;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.2s;
  }
  .text-badge:hover .size-hint,
  .text-badge.scaling .size-hint {
    opacity: 1;
  }

  .toast {
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%) translateY(80px);
    background: #333;
    color: #fff;
    padding: 10px 20px;
    border-radius: 8px;
    font-size: 14px;
    opacity: 0;
    transition: transform 0.3s ease, opacity 0.3s ease;
    pointer-events: none;
    z-index: 100;
  }
  .toast.show {
    transform: translateX(-50%) translateY(0);
    opacity: 1;
  }
</style>
</head>
<body>

<div class="toolbar">
  <div class="toolbar-group">
    <span class="toolbar-label">Tool</span>
    <button class="tool-btn active" id="drawToolBtn" data-tool="draw">Draw</button>
    <button class="tool-btn" id="textToolBtn" data-tool="text">Text</button>
  </div>

  <div class="separator"></div>

  <div class="toolbar-group">
    <span class="toolbar-label">Color</span>
    <div class="color-swatch" data-color="#000000" style="background:#000000"></div>
    <div class="color-swatch" data-color="#ffffff" style="background:#ffffff"></div>
    <div class="color-swatch active" data-color="#e74c3c" style="background:#e74c3c;border-color:#fff"></div>
    <div class="color-swatch" data-color="#e67e22" style="background:#e67e22"></div>
    <div class="color-swatch" data-color="#f1c40f" style="background:#f1c40f"></div>
    <div class="color-swatch" data-color="#2ecc71" style="background:#2ecc71"></div>
    <div class="color-swatch" data-color="#3498db" style="background:#3498db"></div>
    <div class="color-swatch" data-color="#9b59b6" style="background:#9b59b6"></div>
    <input type="color" id="customColor" value="#ff00ff" title="Custom color">
  </div>

  <div class="separator"></div>

  <div class="toolbar-group" id="widthGroup">
    <span class="toolbar-label">Width</span>
    <div class="width-btn" data-width="2"><div class="width-dot" style="width:4px;height:4px"></div></div>
    <div class="width-btn" data-width="5"><div class="width-dot" style="width:7px;height:7px"></div></div>
    <div class="width-btn active" data-width="10"><div class="width-dot" style="width:11px;height:11px"></div></div>
    <div class="width-btn" data-width="20"><div class="width-dot" style="width:16px;height:16px"></div></div>
  </div>

  <div class="separator"></div>

  <div class="toolbar-group">
    <button class="action-btn" id="undoBtn">Undo</button>
    <button class="action-btn danger" id="clearBtn">Clear</button>
  </div>

  <div class="spacer"></div>

  <div class="toolbar-group">
    <button class="action-btn primary" id="copyBtn">Copy to Clipboard</button>
    <button class="action-btn" id="saveBtn">Save as PNG</button>
  </div>
</div>

<div class="canvas-container" id="canvasContainer">
  <canvas id="canvas"></canvas>
  <div class="text-overlay" id="textOverlay"></div>
</div>

<div class="toast" id="toast"></div>

<script>
(function() {
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  const canvasContainer = document.getElementById("canvasContainer");
  const textOverlay = document.getElementById("textOverlay");
  const img = new Image();
  let drawing = false;
  let currentColor = "#e74c3c";
  let currentWidth = 10;
  let currentTool = "draw"; // "draw" or "text"
  let history = [];
  let baseImageData = null;

  // Smooth drawing state
  let strokePoints = [];

  // Text tool state
  let activeTextBadge = null;
  let textDragging = false;
  let textDragOffset = { x: 0, y: 0 };

  function showToast(msg) {
    const t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 2000);
  }

  img.onload = function() {
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx.drawImage(img, 0, 0);
    baseImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    pushHistory();
    syncTextOverlaySize();
  };
  img.src = "data:image/png;base64,${base64Image}";

  function pushHistory() {
    history.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    if (history.length > 50) history.shift();
  }

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  function getClientPos(e) {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX, y: clientY };
  }

  // --- Smooth drawing with quadratic bezier interpolation ---

  function smoothRedraw() {
    // Restore canvas to last history state, then draw current stroke
    if (history.length > 0) {
      ctx.putImageData(history[history.length - 1], 0, 0);
    }
    drawSmoothStroke(strokePoints);
  }

  function drawSmoothStroke(points) {
    if (points.length < 2) return;

    ctx.beginPath();
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = currentWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.moveTo(points[0].x, points[0].y);

    if (points.length === 2) {
      ctx.lineTo(points[1].x, points[1].y);
    } else {
      // Use quadratic bezier curves through midpoints for smooth interpolation
      for (let i = 1; i < points.length - 1; i++) {
        const midX = (points[i].x + points[i + 1].x) / 2;
        const midY = (points[i].y + points[i + 1].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
      }
      // Connect to last point
      const last = points[points.length - 1];
      const prev = points[points.length - 2];
      ctx.quadraticCurveTo(prev.x, prev.y, last.x, last.y);
    }

    ctx.stroke();
  }

  // Ramer-Douglas-Peucker simplification
  function simplifyPoints(points, epsilon) {
    if (points.length <= 2) return points;

    // Find the point with the maximum distance from the line between first and last
    let maxDist = 0;
    let maxIndex = 0;
    const first = points[0];
    const last = points[points.length - 1];

    for (let i = 1; i < points.length - 1; i++) {
      const d = perpendicularDist(points[i], first, last);
      if (d > maxDist) {
        maxDist = d;
        maxIndex = i;
      }
    }

    if (maxDist > epsilon) {
      const left = simplifyPoints(points.slice(0, maxIndex + 1), epsilon);
      const right = simplifyPoints(points.slice(maxIndex), epsilon);
      return left.slice(0, -1).concat(right);
    } else {
      return [first, last];
    }
  }

  function perpendicularDist(point, lineStart, lineEnd) {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(point.x - lineStart.x, point.y - lineStart.y);
    const t = Math.max(0, Math.min(1, ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lenSq));
    const projX = lineStart.x + t * dx;
    const projY = lineStart.y + t * dy;
    return Math.hypot(point.x - projX, point.y - projY);
  }

  function startDraw(e) {
    if (currentTool !== "draw") return;
    e.preventDefault();
    drawing = true;
    const pos = getPos(e);
    strokePoints = [pos];
  }

  function draw(e) {
    if (!drawing || currentTool !== "draw") return;
    e.preventDefault();
    const pos = getPos(e);
    strokePoints.push(pos);
    smoothRedraw();
  }

  function endDraw(e) {
    if (!drawing) return;
    drawing = false;
    if (strokePoints.length >= 3) {
      // Simplify, then do final smooth render
      const epsilon = Math.max(0.5, currentWidth * 0.15);
      strokePoints = simplifyPoints(strokePoints, epsilon);
      smoothRedraw();
    }
    strokePoints = [];
    pushHistory();
  }

  canvas.addEventListener("mousedown", startDraw);
  canvas.addEventListener("mousemove", draw);
  canvas.addEventListener("mouseup", endDraw);
  canvas.addEventListener("mouseleave", endDraw);
  canvas.addEventListener("touchstart", startDraw, { passive: false });
  canvas.addEventListener("touchmove", draw, { passive: false });
  canvas.addEventListener("touchend", endDraw);

  // --- Tool switching ---
  function setTool(tool) {
    currentTool = tool;
    document.querySelectorAll(".tool-btn").forEach(b => b.classList.remove("active"));
    document.querySelector('.tool-btn[data-tool="' + tool + '"]').classList.add("active");

    if (tool === "draw") {
      canvas.style.cursor = "crosshair";
      document.getElementById("widthGroup").style.display = "flex";
      // Confirm any active text
      if (activeTextBadge) confirmText();
    } else if (tool === "text") {
      canvas.style.cursor = "text";
      document.getElementById("widthGroup").style.display = "none";
    }
  }

  document.querySelectorAll(".tool-btn").forEach(el => {
    el.addEventListener("click", () => setTool(el.dataset.tool));
  });

  // --- Text tool ---

  function syncTextOverlaySize() {
    const rect = canvas.getBoundingClientRect();
    textOverlay.style.width = rect.width + "px";
    textOverlay.style.height = rect.height + "px";
    textOverlay.style.left = (canvas.offsetLeft) + "px";
    textOverlay.style.top = (canvas.offsetTop) + "px";
  }

  new ResizeObserver(syncTextOverlaySize).observe(canvas);

  function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
  }

  function luminance(r, g, b) {
    return 0.299 * r + 0.587 * g + 0.114 * b;
  }

  function getBadgeColors(hexColor) {
    const rgb = hexToRgb(hexColor);
    const lum = luminance(rgb.r, rgb.g, rgb.b);
    // Solid badge: light text gets dark badge, dark text gets light badge
    if (lum > 140) {
      return {
        textColor: hexColor,
        badgeBg: "#1a1a1a"
      };
    } else {
      // Lighten the color for the badge background
      const lighten = (v) => Math.min(255, Math.round(v + (255 - v) * 0.82));
      return {
        textColor: hexColor,
        badgeBg: "rgb(" + lighten(rgb.r) + "," + lighten(rgb.g) + "," + lighten(rgb.b) + ")"
      };
    }
  }

  function createTextBadge(cssX, cssY) {
    // If there's already an active badge, confirm it first
    if (activeTextBadge) confirmText();

    const colors = getBadgeColors(currentColor);
    const badge = document.createElement("div");
    badge.className = "text-badge";
    badge.style.left = cssX + "px";
    badge.style.top = cssY + "px";

    let scale = 1.0;
    badge._scale = scale;
    badge._color = currentColor;

    badge.style.background = colors.badgeBg;
    badge.style.borderRadius = "8px";
    badge.style.padding = "6px 14px";
    badge.style.color = colors.textColor;
    badge.style.transform = "translate(-50%, -50%) scale(" + scale + ")";
    badge.style.border = "2px solid rgba(120, 92, 255, 0.6)";
    badge.style.textAlign = "center";

    const ta = document.createElement("textarea");
    ta.rows = 1;
    ta.placeholder = "Type...";
    ta.style.color = colors.textColor;
    badge.appendChild(ta);

    const hint = document.createElement("span");
    hint.className = "size-hint";
    hint.textContent = "Scroll to resize";
    badge.appendChild(hint);

    // Hidden mirror for measuring text size
    const mirror = document.createElement("div");
    mirror.style.cssText = "position:absolute;visibility:hidden;pointer-events:none;white-space:pre;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',sans-serif;font-weight:700;font-size:24px;line-height:1.3;padding:0;margin:0;";
    document.body.appendChild(mirror);
    badge._mirror = mirror;

    textOverlay.classList.add("active");
    textOverlay.appendChild(badge);
    activeTextBadge = badge;

    // Focus after append
    requestAnimationFrame(() => ta.focus());

    // Auto-size textarea to fit content
    function autoSize() {
      // Use the mirror div to measure exact rendered size
      const val = ta.value || " ";
      mirror.textContent = val;
      // For multiline, replace newlines with actual line breaks
      mirror.innerText = val;
      const w = mirror.offsetWidth;
      const h = mirror.offsetHeight;
      ta.style.width = Math.max(10, w + 4) + "px";
      ta.style.height = Math.max(Math.round(24 * 1.3), h) + "px";
    }
    ta.addEventListener("input", autoSize);

    // Shift+Enter for newline, Enter to confirm, Escape to cancel
    ta.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        confirmText();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        cancelText();
      }
    });

    // Drag to reposition
    badge.addEventListener("mousedown", (e) => {
      if (e.target === ta && !textDragging) return; // Let textarea handle clicks
      e.preventDefault();
      textDragging = true;
      const overlayRectNow = textOverlay.getBoundingClientRect();
      textDragOffset.x = e.clientX - overlayRectNow.left - parseFloat(badge.style.left);
      textDragOffset.y = e.clientY - overlayRectNow.top - parseFloat(badge.style.top);
    });

    // Scroll wheel to scale
    badge.addEventListener("wheel", (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.05 : 0.05;
      scale = Math.max(0.3, Math.min(5.0, scale + delta));
      badge._scale = scale;
      badge.style.transform = "translate(-50%, -50%) scale(" + scale + ")";
      badge.classList.add("scaling");
      clearTimeout(badge._scaleTimer);
      badge._scaleTimer = setTimeout(() => badge.classList.remove("scaling"), 800);
    });
  }

  // Global mouse move/up for drag
  document.addEventListener("mousemove", (e) => {
    if (!textDragging || !activeTextBadge) return;
    const overlayRect = textOverlay.getBoundingClientRect();
    const newLeft = e.clientX - overlayRect.left - textDragOffset.x;
    const newTop = e.clientY - overlayRect.top - textDragOffset.y;
    activeTextBadge.style.left = newLeft + "px";
    activeTextBadge.style.top = newTop + "px";
  });

  document.addEventListener("mouseup", () => {
    textDragging = false;
  });

  function removeBadgeMirror(badge) {
    if (badge._mirror && badge._mirror.parentNode) {
      badge._mirror.parentNode.removeChild(badge._mirror);
    }
  }

  function confirmText() {
    if (!activeTextBadge) return;
    const ta = activeTextBadge.querySelector("textarea");
    const text = ta ? ta.value.trim() : "";
    if (!text) {
      cancelText();
      return;
    }

    // Render the badge onto the canvas
    renderTextBadgeToCanvas(activeTextBadge, text);
    pushHistory();

    // Clean up
    removeBadgeMirror(activeTextBadge);
    textOverlay.removeChild(activeTextBadge);
    activeTextBadge = null;
    textOverlay.classList.remove("active");
  }

  function cancelText() {
    if (!activeTextBadge) return;
    removeBadgeMirror(activeTextBadge);
    textOverlay.removeChild(activeTextBadge);
    activeTextBadge = null;
    textOverlay.classList.remove("active");
  }

  function renderTextBadgeToCanvas(badge, text) {
    const scale = badge._scale || 1;
    const color = badge._color || currentColor;
    const colors = getBadgeColors(color);

    const canvasRect = canvas.getBoundingClientRect();
    const canvasScaleX = canvas.width / canvasRect.width;
    const canvasScaleY = canvas.height / canvasRect.height;

    const baseFontSize = 24;
    const fontSize = baseFontSize * scale * canvasScaleX;
    const lineHeight = fontSize * 1.3;
    const paddingH = 14 * scale * canvasScaleX;
    const paddingV = 6 * scale * canvasScaleY;
    const borderRadius = 8 * scale * canvasScaleX;

    ctx.font = "700 " + fontSize + "px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif";

    const lines = text.split("\\n");
    let maxLineWidth = 0;
    lines.forEach(line => {
      const w = ctx.measureText(line).width;
      if (w > maxLineWidth) maxLineWidth = w;
    });

    const badgeW = maxLineWidth + paddingH * 2;
    const badgeH = lineHeight * lines.length + paddingV * 2;

    // Badge CSS left/top is its center (due to translate(-50%,-50%))
    const centerLeft = parseFloat(badge.style.left);
    const centerTop = parseFloat(badge.style.top);
    const centerX = centerLeft * canvasScaleX;
    const centerY = centerTop * canvasScaleY;
    const canvasX = centerX - badgeW / 2;
    const canvasY = centerY - badgeH / 2;

    // Draw rounded rect background
    ctx.fillStyle = colors.badgeBg;
    roundRect(ctx, canvasX, canvasY, badgeW, badgeH, borderRadius);
    ctx.fill();

    // Draw each line centered
    ctx.fillStyle = colors.textColor;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    const firstLineY = canvasY + paddingV + lineHeight / 2;
    lines.forEach((line, i) => {
      ctx.fillText(line, centerX, firstLineY + i * lineHeight);
    });
    ctx.textAlign = "start";
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  // Click on canvas to place text
  canvas.addEventListener("click", (e) => {
    if (currentTool !== "text") return;
    const rect = canvas.getBoundingClientRect();
    const overlayRect = textOverlay.getBoundingClientRect();
    const cssX = e.clientX - overlayRect.left;
    const cssY = e.clientY - overlayRect.top;
    createTextBadge(cssX, cssY);
  });

  // Color swatches
  document.querySelectorAll(".color-swatch").forEach(el => {
    el.addEventListener("click", () => {
      document.querySelectorAll(".color-swatch").forEach(s => s.classList.remove("active"));
      el.classList.add("active");
      currentColor = el.dataset.color;
      updateActiveTextColor();
    });
  });

  document.getElementById("customColor").addEventListener("input", (e) => {
    document.querySelectorAll(".color-swatch").forEach(s => s.classList.remove("active"));
    currentColor = e.target.value;
    updateActiveTextColor();
  });

  function updateActiveTextColor() {
    if (!activeTextBadge) return;
    const colors = getBadgeColors(currentColor);
    activeTextBadge.style.background = colors.badgeBg;
    activeTextBadge.style.color = colors.textColor;
    activeTextBadge._color = currentColor;
    const ta = activeTextBadge.querySelector("textarea");
    if (ta) ta.style.color = colors.textColor;
  }

  // Width buttons
  document.querySelectorAll(".width-btn").forEach(el => {
    el.addEventListener("click", () => {
      document.querySelectorAll(".width-btn").forEach(b => b.classList.remove("active"));
      el.classList.add("active");
      currentWidth = parseInt(el.dataset.width);
    });
  });

  // Undo
  document.getElementById("undoBtn").addEventListener("click", () => {
    if (history.length > 1) {
      history.pop();
      ctx.putImageData(history[history.length - 1], 0, 0);
    }
  });

  // Clear
  document.getElementById("clearBtn").addEventListener("click", () => {
    if (activeTextBadge) cancelText();
    if (baseImageData) {
      ctx.putImageData(baseImageData, 0, 0);
      history = [ctx.getImageData(0, 0, canvas.width, canvas.height)];
    }
  });

  // Native bridge callbacks
  window._onCopyResult = function(success) {
    showToast(success ? "Copied to clipboard!" : "Copy failed");
  };
  window._onSaveResult = function(success) {
    showToast(success ? "Saved!" : "Save failed");
  };

  // Copy
  document.getElementById("copyBtn").addEventListener("click", () => {
    if (activeTextBadge) confirmText();
    const dataUrl = canvas.toDataURL("image/png");
    window.webkit.messageHandlers.copyImage.postMessage(dataUrl);
  });

  // Save
  document.getElementById("saveBtn").addEventListener("click", () => {
    if (activeTextBadge) confirmText();
    const dataUrl = canvas.toDataURL("image/png");
    window.webkit.messageHandlers.saveImage.postMessage(dataUrl);
  });

  // Keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "z") {
      e.preventDefault();
      document.getElementById("undoBtn").click();
    }
    if ((e.metaKey || e.ctrlKey) && e.key === "s") {
      e.preventDefault();
      document.getElementById("saveBtn").click();
    }
    // D for draw tool, T for text tool (when not typing in text input)
    if (!e.metaKey && !e.ctrlKey && !e.altKey) {
      const active = document.activeElement;
      const isTyping = active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA");
      if (!isTyping) {
        if (e.key === "d") setTool("draw");
        if (e.key === "t") setTool("text");
      }
    }
  });
})();
</script>
</body>
</html>`;
}
