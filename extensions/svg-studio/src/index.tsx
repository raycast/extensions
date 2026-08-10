import { Form, ActionPanel, Action, Clipboard, showToast, Toast, open, Icon, popToRoot, Detail } from "@raycast/api";
import React, { useState, useEffect, useRef } from "react";
import fs from "fs";
import os from "os";
import path from "path";
import { Buffer } from "buffer";

function generateHtml(svgCode: string): string {
  const base64Code = Buffer.from(svgCode).toString("base64");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SVG Studio</title>
    <style>
        :root { 
            --bg-body: #f5f5f7; --bg-panel: #ffffff; --text: #333; --border: #e1e4e8; 
            --accent: #007aff; --toolbar-h: 50px;
        }
        [data-theme="dark"] { 
            --bg-body: #1e1e1e; --bg-panel: #252526; --text: #cccccc; --border: #3e3e42; 
            --accent: #0e639c;
        }
        body { font-family: -apple-system, system-ui, sans-serif; background: var(--bg-body); color: var(--text); margin: 0; padding: 0; height: 100vh; overflow: hidden; display: flex; flex-direction: column; }
        .header { height: var(--toolbar-h); background: var(--bg-panel); border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; padding: 0 15px; flex-shrink: 0; z-index: 20; }
        .header-left, .header-right { display: flex; align-items: center; gap: 10px; }
        .title { font-weight: 600; font-size: 14px; }
        .author-info { font-size: 11px; opacity: 0.5; font-weight: normal; margin-left: 8px; padding-left: 8px; border-left: 1px solid var(--border); }
        .workspace { flex: 1; display: flex; overflow: hidden; position: relative; }
        .sidebar { width: 450px; background: var(--bg-panel); border-right: 1px solid var(--border); display: flex; flex-direction: column; position: relative; z-index: 10; transition: width 0.3s ease; }
        .sidebar.collapsed { width: 0; border-right: none; }
        #editor { flex: 1; font-size: 13px; }
        .error-bar { background: #ffeef0; color: #b31d28; font-size: 12px; padding: 8px 15px; border-top: 1px solid #fdaeb7; display: none; flex-shrink: 0; font-family: sans-serif; }
        [data-theme="dark"] .error-bar { background: #5a1e23; color: #ffb3b3; border-top: 1px solid #8b2a30; }
        .preview-area { flex: 1; position: relative; overflow: hidden; background: var(--bg-body); cursor: grab; }
        .preview-area:active { cursor: grabbing; }
        .checkerboard { position: absolute; inset: 0; pointer-events: none; background-image: linear-gradient(45deg, rgba(128,128,128,0.1) 25%, transparent 25%), linear-gradient(-45deg, rgba(128,128,128,0.1) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(128,128,128,0.1) 75%), linear-gradient(-45deg, transparent 75%, rgba(128,128,128,0.1) 75%); background-size: 20px 20px; }
        #transform-layer { position: absolute; top: 50%; left: 50%; display: flex; justify-content: center; align-items: center; pointer-events: auto; }
        .float-toolbar { position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); background: var(--bg-panel); border: 1px solid var(--border); border-radius: 8px; padding: 5px 10px; display: flex; gap: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); align-items: center; z-index: 5; }
        button, select { height: 28px; border: 1px solid var(--border); background: var(--bg-panel); color: var(--text); border-radius: 4px; cursor: pointer; padding: 0 10px; font-size: 12px; display: inline-flex; align-items: center; justify-content: center; }
        button:hover { border-color: var(--accent); color: var(--accent); }
        button.icon-btn { width: 28px; padding: 0; }
        button.primary { background: var(--accent); color: white; border: none; }
        canvas { display: none; }
    </style>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/ace/1.32.7/ace.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/ace/1.32.7/theme-chrome.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/ace/1.32.7/theme-twilight.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/ace/1.32.7/mode-xml.min.js"></script>
</head>
<body>
    <script id="raw-data" type="text/plain">${base64Code}</script>
    <div class="header">
        <div class="header-left">
            <button class="icon-btn" onclick="toggleSidebar()" title="Toggle Sidebar">◫</button>
            <span class="title">SVG Studio</span>
        </div>
        <div class="header-right">
            <button onclick="toggleTheme()" id="themeBtn">🌗 Dark Mode</button>
            <select id="exportScale" title="Export Scale"><option value="1">1x</option><option value="2" selected>2x (Retina)</option><option value="4">4x</option></select>
            <button onclick="handleCopy()" id="btnCopy" title="Copy PNG to Clipboard">📋 Copy</button>
            <button class="primary" onclick="handleDownload()" title="Save PNG to Downloads">💾 Save PNG</button>
        </div>
    </div>
    <div class="workspace">
        <div class="sidebar" id="sidebar">
            <div id="editor"></div>
            <div class="error-bar" id="errorBar"></div>
        </div>
        <div class="preview-area" id="viewport">
            <div class="checkerboard"></div>
            <div id="transform-layer"></div>
            <div class="float-toolbar">
                <button class="icon-btn" onclick="adjustZoom(-0.1, true)" title="Zoom Out">-</button>
                <span id="zoomVal" style="font-size:12px; width:40px; text-align:center; cursor:pointer;" onclick="autoFit()" title="Fit to Window">100%</span>
                <button class="icon-btn" onclick="adjustZoom(0.1, true)" title="Zoom In">+</button>
                <div style="width:1px; height:15px; background:var(--border); margin:0 5px;"></div>
                <button class="icon-btn" onclick="autoFit()" title="Auto Fit (Reset)">⟲</button>
            </div>
        </div>
    </div>
    <canvas id="canvas"></canvas>
    <script>
        var editor; var scale = 1, posX = 0, posY = 0; var isDragging = false, startX = 0, startY = 0, initX = 0, initY = 0, spacePressed = false; var isDark = false; var initialSvg = "";
        
        function initEditor(code) {
            // Check if Ace is loaded (CDN check)
            if (typeof ace === 'undefined') {
                const errorBar = document.getElementById('errorBar');
                errorBar.style.display = 'block';
                errorBar.textContent = "⚠️ Network Error: Unable to load Ace Editor resources. Please check your internet connection.";
                return;
            }

            ace.config.set('basePath', 'https://cdnjs.cloudflare.com/ajax/libs/ace/1.32.7/');
            editor = ace.edit("editor"); editor.setTheme("ace/theme/chrome"); editor.session.setMode("ace/mode/xml"); editor.setValue(code, -1);
            editor.setOptions({ fontSize: "13px", fontFamily: "SF Mono, Menlo, Monaco, Consolas, monospace", showPrintMargin: false, wrap: true, useWorker: false, tabSize: 2 });
            editor.session.on('change', function() { updateSvg(editor.getValue()); });
        }

        function updateSvg(code) {
            const layer = document.getElementById('transform-layer'); const errorBar = document.getElementById('errorBar');
            layer.innerHTML = code;
            const parser = new DOMParser(); const doc = parser.parseFromString(code, "image/svg+xml"); const err = doc.querySelector('parsererror');
            if (err) { errorBar.style.display = 'block'; errorBar.textContent = "XML Error: " + (err.textContent.split('\\n')[0]); } 
            else { errorBar.style.display = 'none'; const svg = layer.querySelector('svg'); 
            if(svg) { if(!svg.getAttribute('width') && !svg.getAttribute('viewBox')) svg.setAttribute('width', '500'); if(!svg.getAttribute('height') && !svg.getAttribute('viewBox')) svg.setAttribute('height', '500'); svg.style.position = 'static'; svg.style.display = 'block'; svg.style.visibility = 'visible'; } }
        }
        function toggleTheme() { isDark = !isDark; document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light'); document.getElementById('themeBtn').innerText = isDark ? '☀️ Light Mode' : '🌗 Dark Mode'; if (editor) editor.setTheme(isDark ? "ace/theme/twilight" : "ace/theme/chrome"); }
        function setTransition(enable) { document.getElementById('transform-layer').style.transition = enable ? 'transform 0.2s cubic-bezier(0.2, 0, 0, 1)' : 'none'; }
        function updateTransform() { document.getElementById('zoomVal').innerText = Math.round(scale * 100) + '%'; document.getElementById('transform-layer').style.transform = \`translate(calc(-50% + \${posX}px), calc(-50% + \${posY}px)) scale(\${scale})\`; }
        function adjustZoom(delta, useAnimation = false) { if (useAnimation) setTransition(true); else setTransition(false); scale = Math.max(0.1, Math.min(10, Math.round((scale + delta)*10)/10)); updateTransform(); }
        function autoFit() {
            const viewport = document.getElementById('viewport'); const layer = document.getElementById('transform-layer'); const svg = layer.querySelector('svg');
            if (!svg || !viewport) { scale = 1; posX = 0; posY = 0; } else {
                let w = parseFloat(svg.getAttribute('width')); let h = parseFloat(svg.getAttribute('height'));
                if (!w || !h) { const viewBox = svg.getAttribute('viewBox'); if (viewBox) { const parts = viewBox.split(/[\\s,]+/).filter(Boolean); if (parts.length === 4) { w = parseFloat(parts[2]); h = parseFloat(parts[3]); } } }
                if (!w) w = 500; if (!h) h = 500;
                const containerW = viewport.clientWidth; const containerH = viewport.clientHeight; const padding = 60;
                const scaleX = (containerW - padding) / w; const scaleY = (containerH - padding) / h; let fitScale = Math.min(scaleX, scaleY); if (fitScale > 1) fitScale = 1;
                scale = Math.floor(fitScale * 100) / 100; posX = 0; posY = 0;
            }
            setTransition(true); layer.style.position = 'absolute'; layer.style.top = '50%'; layer.style.left = '50%'; updateTransform();
        }
        function toggleSidebar() { const sidebar = document.getElementById('sidebar'); sidebar.classList.toggle('collapsed'); setTimeout(() => { if(editor) editor.resize(); }, 310); }
        try { const base64 = document.getElementById('raw-data').textContent; const binaryString = atob(base64); const bytes = new Uint8Array(binaryString.length); for (let i = 0; i < binaryString.length; i++) { bytes[i] = binaryString.charCodeAt(i); } initialSvg = new TextDecoder().decode(bytes); } catch(e) { console.error(e); initialSvg = "<svg><text>Error decoding SVG</text></svg>"; }
        
        initEditor(initialSvg); 
        updateSvg(initialSvg); 
        setTimeout(autoFit, 100);
        
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) toggleTheme();
        window.addEventListener('keydown', e => { const active = document.activeElement; const isEditorFocused = active && (active.classList.contains('ace_text-input')); if(e.code==='Space' && !isEditorFocused) { spacePressed=true; document.getElementById('viewport').style.cursor='grab'; } });
        window.addEventListener('keyup', e => { if(e.code==='Space') { spacePressed=false; document.getElementById('viewport').style.cursor='grab'; }});
        const viewport = document.getElementById('viewport');
        viewport.addEventListener('mousedown', e => { if(e.button!==0) return; setTransition(false); isDragging=true; startX=e.clientX; startY=e.clientY; initX=posX; initY=posY; viewport.style.cursor='grabbing'; });
        window.addEventListener('mousemove', e => { if(!isDragging) return; e.preventDefault(); posX = initX + (e.clientX - startX); posY = initY + (e.clientY - startY); updateTransform(); });
        window.addEventListener('mouseup', () => { isDragging=false; viewport.style.cursor=spacePressed?'grab':'auto'; });
        function renderToCanvas(callback) {
            const canvas = document.getElementById('canvas'); const ctx = canvas.getContext('2d'); const scaleFactor = parseInt(document.getElementById('exportScale').value) || 2;
            const tempDiv = document.createElement('div'); 
            if (editor) {
                tempDiv.innerHTML = editor.getValue(); 
            } else {
                tempDiv.innerHTML = initialSvg;
            }
            const svgEl = tempDiv.querySelector('svg');
            if(!svgEl) { alert("Invalid SVG Code"); return; } if(!svgEl.getAttribute('width')) svgEl.setAttribute('width', '500'); if(!svgEl.getAttribute('height')) svgEl.setAttribute('height', '500');
            const computedStyle = window.getComputedStyle(svgEl); svgEl.style.fontFamily = computedStyle.fontFamily;
            const s = new XMLSerializer().serializeToString(svgEl); const src = 'data:image/svg+xml;base64,' + window.btoa(unescape(encodeURIComponent(s)));
            const img = new Image(); img.onload = () => { canvas.width = img.width * scaleFactor; canvas.height = img.height * scaleFactor; ctx.scale(scaleFactor, scaleFactor); ctx.drawImage(img, 0, 0); callback(canvas); }; img.onerror = () => alert("Failed to render image"); img.src = src;
        }
        window.handleDownload = function() { renderToCanvas((canvas) => { const link = document.createElement('a'); link.download = 'svg-'+Date.now()+'.png'; link.href = canvas.toDataURL('image/png'); link.click(); }); };
        window.handleCopy = function() { const btn = document.getElementById('btnCopy'); const oldText = btn.innerText; btn.innerText = 'Processing...'; renderToCanvas((canvas) => { canvas.toBlob(blob => { try { const item = new ClipboardItem({ 'image/png': blob }); navigator.clipboard.write([item]); btn.innerText = 'Copied!'; } catch(e) { btn.innerText = 'Error'; alert("Clipboard blocked. Please right-click the image to copy."); } setTimeout(()=>btn.innerText=oldText, 2000); }); }); };
        window.toggleSidebar = toggleSidebar; window.toggleTheme = toggleTheme; window.adjustZoom = adjustZoom; window.autoFit = autoFit; window.resetView = autoFit;
    </script>
</body>
</html>
  `;
}

export default function Command() {
  const [svgInput, setSvgInput] = useState<string>("");
  const [viewState, setViewState] = useState<"checking" | "manual">("checking");
  // Use useRef to prevent duplicate opening instead of LocalStorage
  const hasOpened = useRef(false);

  const openPreview = async (code: string) => {
    // Simple memory lock to prevent duplicate triggering in this session, not persistent
    if (hasOpened.current) return;
    hasOpened.current = true;

    try {
      const htmlContent = generateHtml(code);
      const fileName = `svg-studio-${Date.now()}.html`;
      const filePath = path.join(os.tmpdir(), fileName);
      await fs.promises.writeFile(filePath, htmlContent);
      await open(filePath);
      return true;
    } catch (error) {
      showToast(Toast.Style.Failure, "Open failed", String(error));
      hasOpened.current = false; // Allow retry on failure
      return false;
    }
  };

  useEffect(() => {
    async function init() {
      try {
        const text = await Clipboard.readText();
        if (text && text.includes("<svg")) {
          setSvgInput(text);
          await showToast(Toast.Style.Animated, "SVG Studio", "Launching...");
          await openPreview(text);
          // Clear clipboard and input to prevent repeated auto-opening on next launch
          try {
            await Clipboard.copy("");
          } catch (e) {
            // ignore if clipboard clearing fails
          }
          setSvgInput("");
          await popToRoot();
        } else {
          setViewState("manual");
        }
      } catch (e) {
        setViewState("manual");
      }
    }
    init();
  }, []);

  const handleManualOpen = async () => {
    if (!svgInput.trim().includes("<svg")) {
      showToast(Toast.Style.Failure, "Invalid Code", "Please ensure it contains <svg> tags");
      return;
    }
    await openPreview(svgInput);
    // Clear clipboard and reset input to prevent accidental re-opening
    try {
      await Clipboard.copy("");
    } catch (e) {
      // ignore
    }
    setSvgInput("");
    await popToRoot();
  };

  if (viewState === "checking") return <Detail isLoading={true} />;

  return (
    <Form
      actions={
        <ActionPanel>
          <Action title="Open Svg Studio" icon={Icon.Globe} onAction={handleManualOpen} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="svg"
        title="SVG Code"
        placeholder="Paste SVG code here..."
        value={svgInput}
        onChange={setSvgInput}
      />
    </Form>
  );
}
