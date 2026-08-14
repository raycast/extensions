import { Cache, environment, getPreferenceValues, showToast, Toast, WindowManagement } from "@raycast/api";

type LayoutGrid = number[][];

const MAX_WINDOWS = 10;
const SNAPSHOT_TTL = 12 * 60 * 60 * 1000;

const cache = new Cache();

// Original bounds captured right before tiling, so the same hotkey can
// toggle back: press once to tile, press again to restore.
interface Snapshot {
  savedAt: number;
  ids: string[];
  windows: { id: string; desktopId: string; x: number; y: number; width: number; height: number }[];
}

function layoutFor(count: number): LayoutGrid {
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

function isTileable(w: WindowManagement.Window): boolean {
  return w.positionable && w.resizable && w.bounds !== "fullscreen";
}

function isRaycastWindow(w: WindowManagement.Window): boolean {
  const name = w.application?.name?.toLowerCase();
  return name === "raycast" || name === "raycast beta";
}

// Sort by window id (creation order) so the same window always lands in the same
// grid slot across repeated invocations. Titles are too volatile for this —
// terminal titles change with the working directory.
function byWindowId(a: WindowManagement.Window, b: WindowManagement.Window): number {
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

  return Object.entries(extents).map(([n, e]) => {
    const colSpan = e.maxC - e.minC + 1;
    const rowSpan = e.maxR - e.minR + 1;
    return {
      windowIndex: Number(n) - 1,
      x: Math.round(gap + e.minC * (cellW + gap)),
      y: Math.round(gap + e.minR * (cellH + gap)),
      width: Math.round(colSpan * cellW + (colSpan - 1) * gap),
      height: Math.round(rowSpan * cellH + (rowSpan - 1) * gap),
    };
  });
}

export async function runTile(scope: "app" | "all") {
  if (!environment.canAccess(WindowManagement)) {
    await showToast({ style: Toast.Style.Failure, title: "Window Management permission required" });
    return;
  }

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
  const isExcluded = (w: WindowManagement.Window) => excluded.has(w.application?.name?.toLowerCase() ?? "");

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Tiling windows…",
  });

  try {
    const [windows, desktops] = await Promise.all([
      WindowManagement.getWindowsOnActiveDesktop(),
      WindowManagement.getDesktops(),
    ]);

    let targetAppName: string | undefined;
    let targetWindows: WindowManagement.Window[];

    if (scope === "all") {
      targetWindows = windows
        .filter((w) => isTileable(w) && !isRaycastWindow(w) && !isExcluded(w))
        .sort(byWindowId)
        .slice(0, MAX_WINDOWS);

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
          if (windows.some((w) => w.application?.name?.toLowerCase() === lower && isTileable(w))) {
            targetAppName = candidate;
            break;
          }
        }
      } else {
        try {
          const active = await WindowManagement.getActiveWindow();
          targetAppName = active.application?.name;
        } catch {
          /* no active window */
        }
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
      targetWindows = windows
        .filter((w) => w.application?.name?.toLowerCase() === targetLower && isTileable(w) && !isExcluded(w))
        .sort(byWindowId)
        .slice(0, MAX_WINDOWS);

      if (targetWindows.length === 0) {
        toast.style = Toast.Style.Failure;
        toast.title = `No tileable windows for ${targetAppName}`;
        return;
      }
    }

    // Toggle: if the previous invocation tiled exactly this window set, restore
    // the saved original bounds instead of tiling again.
    const cacheKey = `original-bounds:${scope}`;
    const currentIds = targetWindows
      .map((w) => w.id)
      .sort()
      .join(",");
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
        const results = await Promise.allSettled(
          snapshot.windows.map((s) =>
            WindowManagement.setWindowBounds({
              id: s.id,
              desktopId: s.desktopId,
              bounds: {
                position: { x: s.x, y: s.y },
                size: { width: s.width, height: s.height },
              },
            }),
          ),
        );
        const failed = results.filter((r) => r.status === "rejected").length;
        if (failed === snapshot.windows.length) {
          toast.style = Toast.Style.Failure;
          toast.title = "Failed to restore windows";
        } else {
          const restored = snapshot.windows.length - failed;
          toast.style = Toast.Style.Success;
          toast.title = `Restored ${restored} window${restored === 1 ? "" : "s"}`;
        }
        return;
      }
      // Snapshot expired or the window set changed — fall through to tile and re-save.
    }

    // Resolve desktop from the target windows so multi-monitor setups pick the correct screen
    const targetDesktopId = targetWindows[0].desktopId;
    // getWindowsOnActiveDesktop() already scopes to a single desktop (verified on dual-display
    // setups), so this filter is a no-op today — it just guarantees the invariant at code level.
    targetWindows = targetWindows.filter((w) => w.desktopId === targetDesktopId);
    const desktop =
      desktops.find((d) => d.id === targetDesktopId) ??
      desktops.find((d) => d.active && windows.some((w) => w.desktopId === d.id)) ??
      desktops.find((d) => d.active);
    if (!desktop) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not detect active desktop";
      return;
    }

    const count = targetWindows.length;
    const grid = layoutFor(count);
    const frames = computeFrames(grid, desktop.size, gap).filter(
      (f) => f.windowIndex < count && f.width > 0 && f.height > 0,
    );
    if (frames.length === 0) {
      toast.style = Toast.Style.Failure;
      toast.title = "Gap too large for this screen size";
      return;
    }

    const moved = frames.map((f) => targetWindows[f.windowIndex]);
    const snapshot: Snapshot = {
      savedAt: Date.now(),
      ids: currentIds.split(","),
      windows: moved
        .filter((w) => typeof w.bounds !== "string")
        .map((w) => {
          const b = w.bounds as { position: { x: number; y: number }; size: { width: number; height: number } };
          return {
            id: w.id,
            desktopId: w.desktopId,
            x: b.position.x,
            y: b.position.y,
            width: b.size.width,
            height: b.size.height,
          };
        }),
    };
    cache.set(cacheKey, JSON.stringify(snapshot));

    const results = await Promise.allSettled(
      frames.map((f) => {
        const win = targetWindows[f.windowIndex];
        return WindowManagement.setWindowBounds({
          id: win.id,
          desktopId: desktop.id,
          bounds: {
            position: { x: f.x, y: f.y },
            size: { width: f.width, height: f.height },
          },
        });
      }),
    );

    const failed = results.filter((r) => r.status === "rejected").length;
    if (failed === frames.length) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to move any window";
    } else {
      const succeeded = frames.length - failed;
      toast.style = Toast.Style.Success;
      toast.title = `Tiled ${succeeded} ${targetAppName ? `${targetAppName} ` : ""}window${succeeded === 1 ? "" : "s"}`;
    }
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to tile windows";
    toast.message = error instanceof Error ? error.message : String(error);
  }
}
