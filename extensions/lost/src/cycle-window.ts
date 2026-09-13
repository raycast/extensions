import { Cache, LaunchProps, PopToRootType, closeMainWindow, showHUD } from "@raycast/api";
import { AppWindow, focusWindow, getFrontWindow, listWindows } from "./macos-windows";
import { filterWindowsByAppQuery } from "./match-app";

const cycleCache = new Cache({ namespace: "lost-cycle" });

type Direction = 1 | -1;

function familyKey(window: { bundleId: string; appName: string; unixId: number }): string {
  return window.bundleId || window.appName || String(window.unixId);
}

function sameFamily(window: AppWindow, front: { bundleId: string; appName: string; unixId: number }): boolean {
  if (window.bundleId && front.bundleId) {
    return window.bundleId === front.bundleId;
  }
  if (window.appName && front.appName) {
    return window.appName === front.appName;
  }
  return window.unixId === front.unixId;
}

function orderedWindows(windows: AppWindow[]): AppWindow[] {
  return [...windows].sort((left, right) => {
    if (left.index !== right.index) {
      return left.index - right.index;
    }
    return (left.windowId ?? 0) - (right.windowId ?? 0);
  });
}

function pickWindow(windows: AppWindow[], currentId: number | undefined, direction: Direction): AppWindow {
  const ordered = orderedWindows(windows);
  if (ordered.length === 1) {
    return ordered[0];
  }

  const currentIndex = ordered.findIndex((window) => window.windowId === currentId);
  if (currentIndex < 0) {
    return direction === 1 ? ordered[0] : ordered[ordered.length - 1];
  }

  return ordered[(currentIndex + direction + ordered.length) % ordered.length];
}

function hudTitle(window: AppWindow): string {
  const title = window.title.trim() || window.localizedName || window.appName;
  return title.length > 60 ? `${title.slice(0, 57)}…` : title;
}

export async function cycleWindow(direction: Direction, appQuery = "") {
  try {
    await closeMainWindow({ popToRootType: PopToRootType.Immediate });

    const [windows, front] = await Promise.all([listWindows(), getFrontWindow()]);
    const queried = filterWindowsByAppQuery(windows, appQuery);
    const family = appQuery.trim() ? queried : front ? windows.filter((window) => sameFamily(window, front)) : [];

    if (family.length === 0) {
      await showHUD(appQuery.trim() ? `No windows for “${appQuery.trim()}”` : "No windows to cycle");
      return;
    }

    if (family.length === 1) {
      await showHUD(`Only one ${family[0].localizedName || family[0].appName} window`);
      return;
    }

    const key = familyKey(family[0]);
    const cachedId = Number(cycleCache.get(key) ?? 0) || undefined;
    const currentId = front && family.some((window) => window.windowId === front.windowId) ? front.windowId : cachedId;
    const target = pickWindow(family, currentId, direction);

    if (target.windowId && target.windowId === currentId) {
      await showHUD(hudTitle(target));
      return;
    }

    cycleCache.set(key, String(target.windowId ?? 0));
    await focusWindow(target);
    await showHUD(hudTitle(target));
  } catch (error) {
    await showHUD(error instanceof Error ? error.message : String(error));
  }
}

export type CycleLaunchProps = LaunchProps<{ arguments: { app?: string } }>;
