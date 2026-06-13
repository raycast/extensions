import { environment, getPreferenceValues, showToast, Toast, WindowManagement } from "@raycast/api";

type LayoutGrid = number[][];

const MAX_WINDOWS = 10;

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

export default async function Command() {
  if (!environment.canAccess(WindowManagement)) {
    await showToast({ style: Toast.Style.Failure, title: "Window Management permission required" });
    return;
  }

  const prefs = getPreferenceValues<Preferences.Tile>();
  const appNames = (prefs.appName || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const gap = Math.max(0, Number.parseInt(prefs.gap || "0", 10) || 0);

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Tiling windows…",
  });

  try {
    const [windows, desktops] = await Promise.all([
      WindowManagement.getWindowsOnActiveDesktop(),
      WindowManagement.getDesktops(),
    ]);

    // Beta 双屏下每个显示器各有一个 active 桌面，优先选含目标窗口的那个
    const activeDesktop =
      desktops.find((d) => d.active && windows.some((w) => w.desktopId === d.id)) ?? desktops.find((d) => d.active);
    if (!activeDesktop) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not detect active desktop";
      return;
    }

    let targetAppName: string | undefined;
    let targetWindows: WindowManagement.Window[];

    if (prefs.scope === "all") {
      targetWindows = windows.filter((w) => isTileable(w) && !isRaycastWindow(w)).slice(0, MAX_WINDOWS);

      if (targetWindows.length === 0) {
        toast.style = Toast.Style.Failure;
        toast.title = "No tileable windows on the active desktop";
        return;
      }
    } else {
      if (appNames.length > 0) {
        for (const candidate of appNames) {
          const lower = candidate.toLowerCase();
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
        .filter((w) => w.application?.name?.toLowerCase() === targetLower && isTileable(w))
        .slice(0, MAX_WINDOWS);

      if (targetWindows.length === 0) {
        toast.style = Toast.Style.Failure;
        toast.title = `No tileable windows for ${targetAppName}`;
        return;
      }
    }

    const count = targetWindows.length;
    const grid = layoutFor(count);
    const frames = computeFrames(grid, activeDesktop.size, gap).filter((f) => f.windowIndex < count);

    await Promise.allSettled(
      frames.map((f) => {
        const win = targetWindows[f.windowIndex];
        return WindowManagement.setWindowBounds({
          id: win.id,
          desktopId: activeDesktop.id,
          bounds: {
            position: { x: f.x, y: f.y },
            size: { width: f.width, height: f.height },
          },
        });
      }),
    );

    toast.style = Toast.Style.Success;
    toast.title = `Tiled ${count} ${targetAppName ? `${targetAppName} ` : ""}window${count === 1 ? "" : "s"}`;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to tile windows";
    toast.message = error instanceof Error ? error.message : String(error);
  }
}
