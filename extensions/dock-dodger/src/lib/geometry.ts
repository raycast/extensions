// Pure geometry, no macOS calls. All rects use Accessibility coordinates:
// origin at the top-left of the main display, y grows downward.

export type Rect = { x: number; y: number; w: number; h: number };

export type Screen = {
  frame: Rect; // whole display
  visible: Rect; // display minus menu bar and Dock (NSScreen.visibleFrame)
};

export type WindowInfo = {
  pid: number;
  app: string;
  index: number;
  title: string;
  frame: Rect;
  minimized: boolean;
  fullscreen: boolean;
};

export type Move = {
  pid: number;
  app: string;
  index: number;
  title: string;
  from: Rect;
  to: Rect;
};

export type PlanOptions = {
  margin: number; // gap to keep between window and Dock
  shrink: boolean; // shrink windows that are too big to fit above the Dock
  ignoredApps: string[]; // lowercased app names
};

const EPS = 0.5;
const MIN_SIZE = 40;

// Apps whose "windows" are system chrome, never user windows.
const SYSTEM_APPS = new Set([
  "dock",
  "raycast",
  "window server",
  "windowserver",
  "systemuiserver",
  "control center",
  "controlcenter",
  "notification center",
  "notificationcenter",
  "loginwindow",
  "spotlight",
  "screenshot",
  "wallpaper",
]);

const right = (r: Rect) => r.x + r.w;
const bottom = (r: Rect) => r.y + r.h;

function intersectionArea(a: Rect, b: Rect): number {
  const w = Math.min(right(a), right(b)) - Math.max(a.x, b.x);
  const h = Math.min(bottom(a), bottom(b)) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}

function overlaps1D(a0: number, a1: number, b0: number, b1: number): boolean {
  return Math.min(a1, b1) - Math.max(a0, b0) > EPS;
}

export function screenFor(win: Rect, screens: Screen[]): Screen | undefined {
  const cx = win.x + win.w / 2;
  const cy = win.y + win.h / 2;
  const containing = screens.find(
    (s) => cx >= s.frame.x && cx < right(s.frame) && cy >= s.frame.y && cy < bottom(s.frame),
  );
  if (containing) return containing;
  let best: Screen | undefined;
  let bestArea = 0;
  for (const s of screens) {
    const a = intersectionArea(win, s.frame);
    if (a > bestArea) {
      bestArea = a;
      best = s;
    }
  }
  return best;
}

export type DockEdges = { bottom: boolean; left: boolean; right: boolean };

export function dockEdges(s: Screen): DockEdges {
  return {
    bottom: bottom(s.visible) < bottom(s.frame) - EPS,
    left: s.visible.x > s.frame.x + EPS,
    right: right(s.visible) < right(s.frame) - EPS,
  };
}

/**
 * Work out where each window should go so nothing sits behind the Dock.
 * `dock` is the on-screen rect of the Dock's icon strip if known; when given,
 * only windows that actually overlap it along the Dock's long axis are moved.
 */
export function planMoves(screens: Screen[], windows: WindowInfo[], dock: Rect | null, opts: PlanOptions): Move[] {
  const moves: Move[] = [];
  const margin = Math.max(0, opts.margin);

  for (const win of windows) {
    const app = win.app.toLowerCase();
    if (SYSTEM_APPS.has(app) || opts.ignoredApps.includes(app)) continue;
    if (win.minimized || win.fullscreen) continue;
    const f = win.frame;
    if (f.w < MIN_SIZE || f.h < MIN_SIZE) continue;

    const screen = screenFor(f, screens);
    if (!screen) continue;
    const edges = dockEdges(screen);
    if (!edges.bottom && !edges.left && !edges.right) continue; // Dock hidden or on another display

    const dockHere = dock && intersectionArea(dock, screen.frame) > 0 ? dock : null;

    const b = {
      top: screen.visible.y,
      bottom: bottom(screen.visible) - (edges.bottom ? margin : 0),
      left: screen.visible.x + (edges.left ? margin : 0),
      right: right(screen.visible) - (edges.right ? margin : 0),
    };

    // A huge gap preference can leave no room at all; don't squash windows into it.
    if (b.bottom - b.top < MIN_SIZE || b.right - b.left < MIN_SIZE) continue;

    let { x, y, w, h } = f;

    if (edges.bottom && bottom(f) > b.bottom + EPS) {
      const underIcons = !dockHere || overlaps1D(f.x, right(f), dockHere.x, right(dockHere));
      if (underIcons) {
        const avail = b.bottom - b.top;
        if (h > avail && opts.shrink) h = avail;
        y = Math.max(b.top, b.bottom - h);
      }
    }

    if (edges.left && f.x < b.left - EPS) {
      const besideIcons = !dockHere || overlaps1D(f.y, bottom(f), dockHere.y, bottom(dockHere));
      if (besideIcons) {
        const avail = b.right - b.left;
        if (w > avail && opts.shrink) w = avail;
        x = b.left;
      }
    }

    if (edges.right && right(f) > b.right + EPS) {
      const besideIcons = !dockHere || overlaps1D(f.y, bottom(f), dockHere.y, bottom(dockHere));
      if (besideIcons) {
        const avail = b.right - b.left;
        if (w > avail && opts.shrink) w = avail;
        x = Math.max(b.left, b.right - w);
      }
    }

    const to = { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) };
    const changed =
      Math.abs(to.x - f.x) > EPS ||
      Math.abs(to.y - f.y) > EPS ||
      Math.abs(to.w - f.w) > EPS ||
      Math.abs(to.h - f.h) > EPS;
    if (changed) moves.push({ pid: win.pid, app: win.app, index: win.index, title: win.title, from: f, to });
  }

  return moves;
}

/**
 * Find the window to move among one app's windows, by frame. Window order can
 * shift between scan and apply, so `hint` is only tried first. Indexes in
 * `used` were already claimed by an earlier move, so two windows with the same
 * frame each get their own match.
 *
 * Runs inside the JXA apply script via toString(), so it must stay
 * self-contained: no outside references and no nested named functions.
 */
export function pickWindow(pos: number[][], size: number[][], from: Rect, hint: number, used: number[]): number {
  for (let k = -1; k < pos.length; k++) {
    const j = k < 0 ? hint : k;
    if (j < 0 || j >= pos.length || used.indexOf(j) >= 0) continue;
    const p = pos[j];
    const s = size[j];
    if (
      p &&
      s &&
      Math.abs(p[0] - from.x) <= 1 &&
      Math.abs(p[1] - from.y) <= 1 &&
      Math.abs(s[0] - from.w) <= 1 &&
      Math.abs(s[1] - from.h) <= 1
    ) {
      return j;
    }
  }
  return -1;
}

export function parseIgnoredApps(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}
