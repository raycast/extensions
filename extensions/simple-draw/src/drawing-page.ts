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
    overflow: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #111;
  }

  canvas {
    display: block;
    cursor: crosshair;
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

  <div class="toolbar-group">
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

<div class="canvas-container">
  <canvas id="canvas"></canvas>
</div>

<div class="toast" id="toast"></div>

<script>
(function() {
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  const img = new Image();
  let drawing = false;
  let currentColor = "#e74c3c";
  let currentWidth = 10;
  let history = [];
  let baseImageData = null;

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

  function startDraw(e) {
    e.preventDefault();
    drawing = true;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = currentWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }

  function draw(e) {
    if (!drawing) return;
    e.preventDefault();
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }

  function endDraw(e) {
    if (!drawing) return;
    drawing = false;
    ctx.closePath();
    pushHistory();
  }

  canvas.addEventListener("mousedown", startDraw);
  canvas.addEventListener("mousemove", draw);
  canvas.addEventListener("mouseup", endDraw);
  canvas.addEventListener("mouseleave", endDraw);
  canvas.addEventListener("touchstart", startDraw, { passive: false });
  canvas.addEventListener("touchmove", draw, { passive: false });
  canvas.addEventListener("touchend", endDraw);

  // Color swatches
  document.querySelectorAll(".color-swatch").forEach(el => {
    el.addEventListener("click", () => {
      document.querySelectorAll(".color-swatch").forEach(s => s.classList.remove("active"));
      el.classList.add("active");
      currentColor = el.dataset.color;
    });
  });

  document.getElementById("customColor").addEventListener("input", (e) => {
    document.querySelectorAll(".color-swatch").forEach(s => s.classList.remove("active"));
    currentColor = e.target.value;
  });

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
    const dataUrl = canvas.toDataURL("image/png");
    window.webkit.messageHandlers.copyImage.postMessage(dataUrl);
  });

  // Save
  document.getElementById("saveBtn").addEventListener("click", () => {
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
  });
})();
</script>
</body>
</html>`;
}
