// Deterministic timeline for scene.html. render(t, { capture }) puts the scene
// in its state at t seconds. capture: true hides everything the real recorder
// keeps out of the video, which is how the inner GIF's frames are made.

const SEL_START = { x: 272, y: 200 };
const SEL_END = { x: 1008, y: 636 };
const IDLE = { x: 1060, y: 700 };

const T = {
  launcherIn: 0.35,
  typed: [0.7, 0.85, 1.0],
  enter: 1.4,
  pickerIn: 1.6,
  dragStart: 2.0,
  dragEnd: 2.8,
  toRecord: [2.95, 3.3],
  clickRecord: 3.4,
  countdown: 3.5,
  recStart: 5.3,
  toDeploy: [5.4, 5.9],
  clickDeploy: 6.0,
  progress: [6.1, 7.6],
  toChart: [6.4, 7.2],
  toStop: [7.9, 8.4],
  clickStop: 8.55,
  recEnd: 8.8,
  previewIn: [8.9, 9.15],
  converted: 9.5,
};

const RECORDING = { start: T.recStart, end: T.recEnd, rect: rectOf(SEL_START, SEL_END) };
const DURATION = 12.5;

const $ = (id) => document.getElementById(id);
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (t, a, b) => clamp((t - a) / (b - a));
const ease = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const mix = (a, b, p) => ({ x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p });

function rectOf(a, b) {
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) };
}

function show(id, visible, styles = {}) {
  const el = $(id);
  el.style.display = visible ? "" : "none";
  Object.assign(el.style, styles);
}

function centerOf(id) {
  const r = $(id).getBoundingClientRect();

  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

const bars = Array.from({ length: 10 }, () => {
  const bar = document.createElement("div");
  bar.className = "bar";
  $("chart").appendChild(bar);

  return bar;
});

function renderApp(t) {
  bars.forEach((bar, i) => {
    const wave = 0.5 + 0.5 * Math.sin(i * 0.9 + t * 2.4);
    const boost = ease(seg(t, T.progress[0], T.progress[1])) * (i / 10) * 25;
    bar.style.height = `${Math.min(100, 25 + 45 * wave + boost)}%`;
  });

  const progress = ease(seg(t, T.progress[0], T.progress[1]));
  $("progress-fill").style.width = `${progress * 100}%`;
  const status = $("status");
  if (t >= T.progress[1]) {
    status.textContent = "Deployed";
    status.style.color = "#16a34a";
  } else if (t >= T.clickDeploy) {
    status.textContent = `Deploying ${Math.round(progress * 100)}%`;
    status.style.color = "#7c3aed";
  } else {
    status.textContent = "Ready";
    status.style.color = "#8a85a6";
  }

  const pressed = t >= T.clickDeploy && t < T.clickDeploy + 0.15;
  $("deploy").style.transform = pressed ? "scale(0.95)" : "";
}

function renderLauncher(t) {
  const fadeIn = ease(seg(t, T.launcherIn, T.launcherIn + 0.15));
  const fadeOut = ease(seg(t, T.enter + 0.1, T.pickerIn));
  const opacity = fadeIn * (1 - fadeOut);
  show("launcher", opacity > 0, { opacity, transform: `scale(${0.97 + 0.03 * fadeIn})` });
  const typed = T.typed.filter((at) => t >= at).length;
  $("query").textContent = "gif".slice(0, typed);
  const flash = t >= T.enter && t < T.enter + 0.12;
  document.querySelector("#launcher .item.active").style.background = flash
    ? "rgba(255,255,255,0.22)"
    : "rgba(255,255,255,0.1)";
}

function selection(t) {
  const p = ease(seg(t, T.dragStart, T.dragEnd));

  return rectOf(SEL_START, mix(SEL_START, SEL_END, p));
}

function drawDim(alpha, cutout) {
  const canvas = $("dim");
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (alpha <= 0) {
    return;
  }

  ctx.fillStyle = `rgba(0,0,0,${alpha})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (cutout) {
    ctx.clearRect(cutout.x, cutout.y, cutout.w, cutout.h);
  }
}

function placeRect(id, r, extra = {}) {
  show(id, true, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px`, ...extra });
}

function renderHandles(r, visible) {
  const box = $("handles");
  box.innerHTML = "";
  if (!visible) {
    return;
  }

  for (const fx of [0, 0.5, 1]) {
    for (const fy of [0, 0.5, 1]) {
      if (fx === 0.5 && fy === 0.5) {
        continue;
      }
      const h = document.createElement("div");
      h.className = "abs handle";
      h.style.left = `${r.x + r.w * fx}px`;
      h.style.top = `${r.y + r.h * fy}px`;
      box.appendChild(h);
    }
  }
}

function renderPicker(t) {
  const active = t >= T.pickerIn && t < T.clickRecord + 0.05;
  const r = selection(t);
  const dragging = t >= T.dragStart;
  show("hint", active);
  // Same string as the Swift picker; set here so HTML formatting cannot collapse the spacing.
  $("hint").textContent = "Drag to select   Space: pick a window   Enter: record   Esc: cancel";
  renderHandles(r, active && t >= T.dragEnd);
  show("size-label", active && dragging, { left: `${r.x}px`, top: `${r.y - 24}px` });
  $("size-label").textContent = `${Math.round(r.w)} x ${Math.round(r.h)}`;
  show("record-btn", active && t >= T.dragEnd, { left: `${r.x + r.w - 84}px`, top: `${r.y + r.h + 10}px` });
  $("record-btn").style.filter = t >= T.clickRecord ? "brightness(0.8)" : "";

  return { active, r: dragging ? r : null };
}

function renderRecording(t) {
  const r = RECORDING.rect;
  const counting = t >= T.countdown && t < T.recStart;
  const recording = t >= T.recStart && t < T.recEnd;

  const n = 3 - Math.floor((t - T.countdown) / ((T.recStart - T.countdown) / 3));
  show("countdown", counting, { left: `${r.x + r.w / 2 - 70}px`, top: `${r.y + r.h / 2 - 70}px` });
  document.querySelector("#countdown span").textContent = String(n);

  show("pill", recording, { left: `${r.x + r.w / 2 - 84}px`, top: `${r.y + r.h + 14}px` });
  const elapsed = Math.max(0, t - T.recStart);
  const saving = t >= T.clickStop;
  document.querySelector("#pill .time").textContent = saving
    ? "Saving..."
    : `0:${String(Math.floor(elapsed)).padStart(2, "0")}`;
  document.querySelector("#pill .stop").style.opacity = saving ? 0.5 : 1;

  return { counting, recording, r };
}

function cursorAt(t) {
  const record = { x: SEL_END.x - 42, y: SEL_END.y + 24 };
  const deploy = centerOf("deploy");
  const chart = { x: 700, y: 420 };
  const r = RECORDING.rect;
  // Center of the Stop button: pill left + padding + dot + gap + time + gap + half the button.
  const stop = { x: r.x + r.w / 2 - 84 + 126, y: r.y + r.h + 14 + 20 };
  const path = [
    [0, IDLE],
    [T.pickerIn, IDLE],
    [T.dragStart, SEL_START],
    [T.dragEnd, SEL_END],
    [T.toRecord[0], SEL_END],
    [T.toRecord[1], record],
    [T.toDeploy[0], record],
    [T.toDeploy[1], deploy],
    [T.toChart[0], deploy],
    [T.toChart[1], chart],
    [T.toStop[0], chart],
    [T.toStop[1], stop],
    [T.previewIn[0], stop],
    [DURATION, { x: stop.x + 120, y: stop.y + 60 }],
  ];
  for (let i = 1; i < path.length; i++) {
    const [t0, a] = path[i - 1];
    const [t1, b] = path[i];
    if (t <= t1) {
      return mix(a, b, ease(seg(t, t0, t1)));
    }
  }

  return path[path.length - 1][1];
}

function renderCursor(t, picking) {
  const pos = cursorAt(t);
  show("crosshair", picking, { left: `${pos.x}px`, top: `${pos.y}px` });
  show("cursor", !picking, { left: `${pos.x - 3}px`, top: `${pos.y - 2}px` });

  const clicks = [T.clickDeploy, T.clickStop];
  const click = clicks.find((at) => t >= at && t < at + 0.35);
  const p = click === undefined ? 0 : seg(t, click, click + 0.35);
  show("click-ring", click !== undefined, {
    left: `${pos.x}px`,
    top: `${pos.y}px`,
    opacity: 1 - p,
    transform: `translate(-50%, -50%) scale(${0.6 + p * 0.8})`,
  });
}

function formatSize(bytes) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

async function renderPreview(t) {
  const fadeIn = ease(seg(t, T.previewIn[0], T.previewIn[1]));
  show("preview", fadeIn > 0, { opacity: fadeIn, transform: `scale(${0.96 + 0.04 * fadeIn})` });
  if (fadeIn <= 0) {
    return;
  }

  const inner = window.__inner;
  const converted = t >= T.converted;
  $("meta-size").textContent = converted ? formatSize(inner.size) : "-";
  $("meta-dims").textContent = converted ? `${inner.width} x ${inner.height}` : "-";
  $("meta-duration").textContent = converted ? `0:${inner.duration.toFixed(1).padStart(4, "0")}` : "-";

  const toast = $("toast");
  toast.querySelector(".icon").style.background = converted ? "#30d158" : "#8e8c93";
  toast.querySelector("span").textContent = converted
    ? `GIF copied to clipboard   ${formatSize(inner.size)}`
    : "Converting to GIF...";

  const img = $("inner");
  img.style.visibility = converted ? "visible" : "hidden";
  const index = converted ? Math.floor((t - T.converted) * inner.fps) % inner.count : 0;
  const src = `${inner.dir}/${String(index + 1).padStart(4, "0")}.png`;
  if (!img.src.endsWith(src)) {
    img.src = src;
    await img.decode();
  }
}

window.render = async (t, options = {}) => {
  renderApp(t);
  if (options.capture) {
    ["launcher", "hint", "size-label", "record-btn", "countdown", "pill", "preview", "crosshair"].forEach((id) =>
      show(id, false),
    );
    show("selection", false);
    $("handles").innerHTML = "";
    drawDim(0);
    renderCursor(t, false);
    show("crosshair", false);

    return;
  }

  renderLauncher(t);
  const picker = renderPicker(t);
  const rec = renderRecording(t);

  if (picker.active) {
    drawDim(0.4, picker.r);
    if (picker.r) {
      placeRect("selection", picker.r);
      $("selection").className = "abs";
    } else {
      show("selection", false);
    }
  } else if (rec.counting || rec.recording) {
    // macOS dims the rest of the screen during a region recording.
    drawDim(0.22, rec.r);
    const pad = 4;
    placeRect(
      "selection",
      { x: rec.r.x - pad, y: rec.r.y - pad, w: rec.r.w + pad * 2, h: rec.r.h + pad * 2 },
      { display: rec.recording ? "" : "none" },
    );
    $("selection").className = "abs dashed";
  } else {
    drawDim(0);
    show("selection", false);
  }

  renderCursor(t, picker.active);
  await renderPreview(t);
};

window.TIMELINE = { RECORDING, DURATION };
