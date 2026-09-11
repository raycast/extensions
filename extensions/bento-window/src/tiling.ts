import { Cache, getPreferenceValues, open, showToast, Toast } from "@raycast/api";
import { AccessibilityError, applyMoves, getState, getTileable, WMMove, WMScreen, WMWindow } from "./wm";

type LayoutGrid = number[][];

const MAX_WINDOWS = 10;
const SNAPSHOT_TTL = 12 * 60 * 60 * 1000;

const cache = new Cache();

// Original bounds captured right before tiling, so the same hotkey can
// toggle back: press once to tile, press again to restore. `tiled` records
// where the grid actually placed each window — if a window has been dragged
// away from its slot, the next press re-tiles instead of restoring.
interface WindowBounds {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Snapshot {
  savedAt: number;
  ids: string[];
  windows: WindowBounds[];
  tiled: WindowBounds[];
}

// Terminals snap their size to character-cell multiples, so achieved bounds
// can drift from the requested frame by a couple of cells.
const TILED_TOLERANCE = 30;

function isNearTiledSlot(w: WMWindow, slot: WindowBounds): boolean {
  return (
    Math.abs(w.x - slot.x) <= TILED_TOLERANCE &&
    Math.abs(w.y - slot.y) <= TILED_TOLERANCE &&
    Math.abs(w.width - slot.width) <= TILED_TOLERANCE &&
    Math.abs(w.height - slot.height) <= TILED_TOLERANCE
  );
}

// Base tables, tuned for a landscape screen. layoutFor() below decides whether
// a given screen is better served by their transpose.
function baseLayout(count: number): LayoutGrid {
  switch (count) {
    case 1:
      return [[1]];
    case 2:
      return [[1, 2]];
    case 3:
      return [
        [1, 3],
        [2, 3],
      ];
    case 4:
      return [
        [1, 2],
        [3, 4],
      ];
    case 5:
      return [
        [1, 2, 5],
        [3, 4, 5],
      ];
    case 6:
      return [
        [1, 2, 3],
        [4, 5, 6],
      ];
    case 7:
      return [
        [1, 2, 3, 4],
        [5, 6, 7, 7],
      ];
    case 8:
      return [
        [1, 2, 3, 4],
        [5, 6, 7, 8],
      ];
    case 9:
      return [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
      ];
    default:
      return [
        [1, 2, 3, 4, 5],
        [6, 7, 8, 9, 10],
      ];
  }
}

function isRaycastWindow(w: WMWindow): boolean {
  const name = w.appName.toLowerCase();
  return name === "raycast" || name === "raycast beta";
}

// A window filling its screen's FULL frame (menu bar area included) is a
// native-fullscreen window — AX can't move it, skip. Zoomed windows only
// fill the visible frame, so they still tile.
function isFullscreen(w: WMWindow, screens: WMScreen[]): boolean {
  return screens.some(
    (s) =>
      Math.abs(w.x - s.frame.x) <= 2 &&
      Math.abs(w.y - s.frame.y) <= 2 &&
      Math.abs(w.width - s.frame.width) <= 2 &&
      Math.abs(w.height - s.frame.height) <= 2,
  );
}

// The screen a window mostly sits on. Testing whether the window's centre falls
// inside a screen looks equivalent but isn't: a window hanging off the bottom
// edge has its centre in dead space and matches nothing, and the caller then
// silently falls back to the first screen — which is how a portrait desktop
// ended up being tiled to the built-in display's proportions.
function screenOf(w: WMWindow, screens: WMScreen[]): WMScreen | undefined {
  let best: WMScreen | undefined;
  let bestArea = 0;
  for (const s of screens) {
    const overlapW = Math.min(w.x + w.width, s.frame.x + s.frame.width) - Math.max(w.x, s.frame.x);
    const overlapH = Math.min(w.y + w.height, s.frame.y + s.frame.height) - Math.max(w.y, s.frame.y);
    if (overlapW <= 0 || overlapH <= 0) continue;
    const area = overlapW * overlapH;
    if (area > bestArea) {
      bestArea = area;
      best = s;
    }
  }
  return best;
}

// Sort by window id (creation order) so the same window always lands in the same
// grid slot across repeated invocations. Titles are too volatile for this —
// terminal titles change with the working directory.
function byWindowId(a: WMWindow, b: WMWindow): number {
  return String(a.id).localeCompare(String(b.id), undefined, { numeric: true });
}

interface Frame {
  windowIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

function computeFrames(grid: LayoutGrid, screen: { width: number; height: number }, gap: number): Frame[] {
  const rows = grid.length;
  const cols = grid[0].length;
  const cellW = (screen.width - gap * (cols + 1)) / cols;
  const cellH = (screen.height - gap * (rows + 1)) / rows;

  const extents: Record<number, { minC: number; maxC: number; minR: number; maxR: number }> = {};
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const n = grid[r][c];
      if (n === 0) continue;
      const e = extents[n];
      if (!e) {
        extents[n] = { minC: c, maxC: c, minR: r, maxR: r };
      } else {
        if (c < e.minC) e.minC = c;
        if (c > e.maxC) e.maxC = c;
        if (r < e.minR) e.minR = r;
        if (r > e.maxR) e.maxR = r;
      }
    }
  }

  // Round the edges, then subtract — neighbouring tiles must agree on the
  // boundary they share. Rounding origin and length separately lets them
  // disagree by a pixel whenever the cell size isn't whole: a 2x5 grid on
  // 1512px leaves hairline gaps, a 5x2 grid on 2304px makes tiles overlap
  // and clip each other's edges.
  return Object.entries(extents).map(([n, e]) => {
    const left = Math.round(gap + e.minC * (cellW + gap));
    const right = Math.round(gap + e.maxC * (cellW + gap) + cellW);
    const top = Math.round(gap + e.minR * (cellH + gap));
    const bottom = Math.round(gap + e.maxR * (cellH + gap) + cellH);
    return {
      windowIndex: Number(n) - 1,
      x: left,
      y: top,
      width: right - left,
      height: bottom - top,
    };
  });
}

// Transposing swaps rows for columns but leaves the numbering running down the
// columns; renumbering in reading order puts slot 1 back at the top-left, which
// is what the creation-order sort assumes.
function transpose(grid: LayoutGrid): LayoutGrid {
  return grid[0].map((_, c) => grid.map((row) => row[c]));
}

function renumberInReadingOrder(grid: LayoutGrid): LayoutGrid {
  const seen = new Map<number, number>();
  return grid.map((row) =>
    row.map((n) => {
      if (n === 0) return 0;
      let slot = seen.get(n);
      if (slot === undefined) {
        slot = seen.size + 1;
        seen.set(n, slot);
      }
      return slot;
    }),
  );
}

// Tiles read best near this aspect. Scored on a log scale so that half and
// double the target count as equally wrong. Anything from 1.0 to 1.5 picks the
// same layout on every screen tested; 16:9 is far enough off that it starts
// flipping landscape screens too, so 1.2 leaves room on both sides.
const TILE_ASPECT = 1.2;

function aspectPenalty(grid: LayoutGrid, area: { width: number; height: number }, gap: number): number {
  const frames = computeFrames(grid, area, gap);
  if (frames.length === 0) return Number.POSITIVE_INFINITY;
  let total = 0;
  for (const f of frames) {
    // A gap too large for the grid yields degenerate tiles — never prefer those.
    if (f.width <= 0 || f.height <= 0) return Number.POSITIVE_INFINITY;
    total += Math.abs(Math.log(f.width / f.height / TILE_ASPECT));
  }
  return total / frames.length;
}

// A portrait screen turns the landscape tables into slivers: two windows on a
// 1296x2304 display would get 648px each, an aspect of 0.28. Instead of a
// portrait threshold and a second hand-written table, score each table against
// its own transpose and keep the better fit — a landscape screen simply never
// picks the transpose, and an unusually wide one gets the same treatment for
// free.
function layoutFor(count: number, area: { width: number; height: number }, gap: number): LayoutGrid {
  const base = baseLayout(count);
  const flipped = renumberInReadingOrder(transpose(base));
  return aspectPenalty(flipped, area, gap) < aspectPenalty(base, area, gap) ? flipped : base;
}

function toMove(current: WMWindow, target: { x: number; y: number; width: number; height: number }): WMMove {
  return {
    id: current.id,
    pid: current.pid,
    cx: current.x,
    cy: current.y,
    cw: current.width,
    ch: current.height,
    x: target.x,
    y: target.y,
    width: target.width,
    height: target.height,
  };
}

export async function runTile(scope: "app" | "all") {
  const prefs = getPreferenceValues<Preferences>();
  const appNames = (prefs.appName || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const gap = Math.max(0, Number.parseInt(prefs.gap || "0", 10) || 0);
  const excluded = new Set(
    (prefs.excludeApps || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
  const isExcluded = (w: WMWindow) => excluded.has(w.appName.toLowerCase());

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Tiling windows…",
  });

  try {
    const { windows, screens, cursor } = await getState();
    if (screens.length === 0) {
      toast.style = Toast.Style.Failure;
      toast.title = "No screens detected";
      return;
    }

    // The pointer decides which desktop is "active". The CG list can't: with
    // per-display Spaces its front-to-back order is grouped by Space rather
    // than global, so its first entry regularly belongs to a screen the user
    // isn't on. Point at the screen you want tiled.
    const activeScreen =
      screens.find(
        (s) =>
          cursor.x >= s.frame.x &&
          cursor.x < s.frame.x + s.frame.width &&
          cursor.y >= s.frame.y &&
          cursor.y < s.frame.y + s.frame.height,
      ) ?? screens[0];
    const onActiveScreen = windows.filter(
      (w) => screenOf(w, screens)?.id === activeScreen.id && !isFullscreen(w, screens),
    );
    // Auto-detect target: the frontmost window on that screen.
    const frontWindow = onActiveScreen.find((w) => !isRaycastWindow(w));

    let targetAppName: string | undefined;
    let targetWindows: WMWindow[];

    if (scope === "all") {
      const candidates = onActiveScreen.filter((w) => !isRaycastWindow(w) && !isExcluded(w)).sort(byWindowId);
      // Drop what Accessibility won't resize (fixed-size utility windows, dialogs)
      // before the layout is computed, or they take a grid slot and leave a hole
      // in it when the resize is refused.
      const tileable = await getTileable(candidates);
      targetWindows = candidates.filter((w) => tileable.has(w.id)).slice(0, MAX_WINDOWS);

      if (targetWindows.length === 0) {
        toast.style = Toast.Style.Failure;
        toast.title = "No tileable windows on the active desktop";
        return;
      }
    } else {
      if (appNames.length > 0) {
        for (const candidate of appNames) {
          const lower = candidate.toLowerCase();
          if (excluded.has(lower)) continue;
          if (onActiveScreen.some((w) => w.appName.toLowerCase() === lower)) {
            targetAppName = candidate;
            break;
          }
        }
      } else {
        targetAppName = frontWindow?.appName;
      }

      if (!targetAppName) {
        toast.style = Toast.Style.Failure;
        toast.title =
          appNames.length > 0
            ? `No tileable windows found (looked for: ${appNames.join(", ")})`
            : "No focused window to detect target app";
        return;
      }

      const targetLower = targetAppName.toLowerCase();
      const candidates = onActiveScreen
        .filter((w) => w.appName.toLowerCase() === targetLower && !isExcluded(w))
        .sort(byWindowId);
      const tileable = await getTileable(candidates);
      targetWindows = candidates.filter((w) => tileable.has(w.id)).slice(0, MAX_WINDOWS);

      if (targetWindows.length === 0) {
        toast.style = Toast.Style.Failure;
        toast.title = `No tileable windows for ${targetAppName}`;
        return;
      }
    }

    // Toggle: if the previous invocation tiled exactly this window set AND the
    // grid is still intact, restore the saved original bounds. If a window has
    // been dragged away from its slot, re-tile instead and keep the earliest
    // original layout so a later press can still return to it.
    const cacheKey = `original-bounds:${scope}`;
    const currentIds = targetWindows
      .map((w) => w.id)
      .sort()
      .join(",");
    let preservedOriginals: WindowBounds[] | undefined;
    const rawSnapshot = cache.get(cacheKey);
    if (rawSnapshot) {
      let snapshot: Snapshot | undefined;
      try {
        snapshot = JSON.parse(rawSnapshot) as Snapshot;
      } catch {
        /* corrupt cache entry */
      }
      cache.remove(cacheKey);
      if (snapshot && Date.now() - snapshot.savedAt < SNAPSHOT_TTL && snapshot.ids.join(",") === currentIds) {
        const tiledById = new Map((snapshot.tiled ?? []).map((s) => [s.id, s]));
        const gridIntact =
          tiledById.size > 0 &&
          targetWindows.every((w) => {
            const slot = tiledById.get(w.id);
            return slot !== undefined && isNearTiledSlot(w, slot);
          });

        if (gridIntact) {
          const windowById = new Map(targetWindows.map((w) => [w.id, w]));
          const restores = snapshot.windows.flatMap((s) => {
            const current = windowById.get(s.id);
            return current ? [toMove(current, s)] : [];
          });
          const { failed } = await applyMoves(restores);
          if (restores.length === 0 || failed.length === restores.length) {
            toast.style = Toast.Style.Failure;
            toast.title = "Failed to restore windows";
          } else {
            const restored = restores.length - failed.length;
            toast.style = Toast.Style.Success;
            toast.title = `Restored ${restored} window${restored === 1 ? "" : "s"}`;
          }
          return;
        }
        // Grid disturbed — re-tile below, carrying the original layout forward.
        preservedOriginals = snapshot.windows;
      }
      // Snapshot expired or the window set changed — fall through to tile and re-save.
    }

    const count = targetWindows.length;
    const area = activeScreen.visible;
    const grid = layoutFor(count, area, gap);
    const frames = computeFrames(grid, area, gap).filter((f) => f.windowIndex < count && f.width > 0 && f.height > 0);
    if (frames.length === 0) {
      toast.style = Toast.Style.Failure;
      toast.title = "Gap too large for this screen size";
      return;
    }

    const moved = frames.map((f) => targetWindows[f.windowIndex]);
    const originals: WindowBounds[] = moved.map((w) => ({
      id: w.id,
      x: w.x,
      y: w.y,
      width: w.width,
      height: w.height,
    }));

    const moves = frames.map((f) =>
      toMove(targetWindows[f.windowIndex], {
        x: area.x + f.x,
        y: area.y + f.y,
        width: f.width,
        height: f.height,
      }),
    );
    const { failed } = await applyMoves(moves);
    if (failed.length > 0) {
      const byId = new Map(targetWindows.map((w) => [w.id, w.appName]));
      console.log("applyMoves failed:", failed.map((id) => `${id}(${byId.get(id) ?? "?"})`).join(", "));
    }

    if (failed.length === frames.length) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to move any window";
    } else {
      // Snapshot after tiling: record the achieved bounds (apps may snap sizes,
      // e.g. terminals round to character cells) so the next press can tell an
      // intact grid from a disturbed one.
      try {
        const { windows: after } = await getState();
        const movedIds = new Set(moved.map((w) => w.id));
        const tiled: WindowBounds[] = after
          .filter((w) => movedIds.has(w.id))
          .map((w) => ({ id: w.id, x: w.x, y: w.y, width: w.width, height: w.height }));
        const snapshot: Snapshot = {
          savedAt: Date.now(),
          ids: currentIds.split(","),
          windows: preservedOriginals ?? originals,
          tiled,
        };
        cache.set(cacheKey, JSON.stringify(snapshot));
      } catch {
        /* snapshot is best-effort — tiling already succeeded */
      }
      const succeeded = frames.length - failed.length;
      toast.style = Toast.Style.Success;
      toast.title = `Tiled ${succeeded} ${targetAppName ? `${targetAppName} ` : ""}window${succeeded === 1 ? "" : "s"}`;
    }
  } catch (error) {
    if (error instanceof AccessibilityError) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Accessibility permission required",
        message: "System Settings → Privacy & Security → Accessibility → enable Raycast",
        primaryAction: {
          title: "Open Accessibility Settings",
          onAction: () => {
            open("x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility");
          },
        },
      });
      return;
    }
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to tile windows";
    toast.message = error instanceof Error ? error.message : String(error);
  }
}
