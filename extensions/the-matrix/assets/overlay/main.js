const path = require("node:path");
const fs = require("node:fs");
const { app, BrowserWindow, screen } = require("electron");

const windows = new Map();
const shutdownAnimationMs = 5200;
const forceQuitMs = 6500;
const stopFilePath = getArgValue("--stop-file");
const soundEnabled = getArgValue("--audio") !== "0";
const matrixDensity = normalizeMatrixDensity(getArgValue("--density"));
let audioWindowId;
let isShuttingDown = false;
let forceQuitTimer;
let stopFileTimer;

app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");

if (stopFilePath) {
  app.setPath("userData", path.join(path.dirname(stopFilePath), "electron"));
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
}

function createWindow(display) {
  const { id, bounds } = display;
  const existingWindow = windows.get(id);

  if (existingWindow && !existingWindow.isDestroyed()) {
    existingWindow.setBounds(bounds);
    return;
  }

  const audioEnabled = soundEnabled && audioWindowId === undefined;

  if (audioEnabled) {
    audioWindowId = id;
  }

  const win = new BrowserWindow({
    ...bounds,
    alwaysOnTop: true,
    backgroundColor: "#00000000",
    enableLargerThanScreen: true,
    focusable: false,
    frame: false,
    fullscreenable: false,
    hasShadow: false,
    maximizable: false,
    minimizable: false,
    movable: false,
    resizable: false,
    roundedCorners: false,
    show: false,
    skipTaskbar: true,
    transparent: true,
    type: "panel",
    webPreferences: {
      backgroundThrottling: false,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.setIgnoreMouseEvents(true, { forward: true });
  win.setAlwaysOnTop(true, "screen-saver");

  if (process.platform === "darwin") {
    win.setVisibleOnAllWorkspaces(true, {
      visibleOnFullScreen: true,
      skipTransformProcessType: true,
    });
  }

  win.once("ready-to-show", () => {
    win.showInactive();
  });

  win.on("closed", () => {
    windows.delete(id);

    if (audioWindowId === id) {
      audioWindowId = undefined;
    }
  });

  win.loadFile(path.join(__dirname, "renderer.html"), {
    query: {
      audio: audioEnabled ? "1" : "0",
      density: matrixDensity,
    },
  });
  windows.set(id, win);
}

function syncWindows() {
  const displays = screen.getAllDisplays();
  const activeDisplayIds = new Set(displays.map((display) => display.id));

  for (const [displayId, win] of windows) {
    if (!activeDisplayIds.has(displayId) && !win.isDestroyed()) {
      win.close();
    }
  }

  for (const display of displays) {
    createWindow(display);
  }
}

app.whenReady().then(() => {
  if (process.platform === "darwin") {
    app.dock.hide();
  }

  syncWindows();
  startStopFileWatcher();

  screen.on("display-added", syncWindows);
  screen.on("display-removed", syncWindows);
  screen.on("display-metrics-changed", syncWindows);
});

app.on("window-all-closed", (event) => {
  event.preventDefault();
});

function beginGracefulShutdown() {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  if (stopFileTimer) {
    clearInterval(stopFileTimer);
  }

  const openWindows = [...windows.values()].filter((win) => !win.isDestroyed());

  if (openWindows.length === 0) {
    app.quit();
    return;
  }

  for (const win of openWindows) {
    win.webContents
      .executeJavaScript("window.beginMatrixExit?.()", true)
      .catch(() => undefined);
  }

  setTimeout(() => {
    if (forceQuitTimer) {
      clearTimeout(forceQuitTimer);
    }

    app.quit();
  }, shutdownAnimationMs);

  forceQuitTimer = setTimeout(() => {
    app.quit();
  }, forceQuitMs);

  forceQuitTimer.unref?.();
}

function startStopFileWatcher() {
  if (!stopFilePath) {
    return;
  }

  stopFileTimer = setInterval(() => {
    if (fs.existsSync(stopFilePath)) {
      beginGracefulShutdown();
    }
  }, 150);

  stopFileTimer.unref?.();
}

function getArgValue(name) {
  const index = process.argv.indexOf(name);

  if (index === -1) {
    return undefined;
  }

  return process.argv[index + 1];
}

function normalizeMatrixDensity(value) {
  return ["sparse", "normal", "dense", "overload"].includes(value)
    ? value
    : "normal";
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    beginGracefulShutdown();
  });
}
