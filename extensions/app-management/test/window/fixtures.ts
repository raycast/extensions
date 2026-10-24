// Copied from raycast-window-switcher test/fixtures.ts on 2026-09-30, unchanged except this header and import paths
import type { HelperApp, HelperWindow, WindowList } from "../../src/lib/window/protocol.ts";

export function win(pid: number, wid: number, title: string, extra: Partial<HelperWindow> = {}): HelperWindow {
  return {
    pid,
    wid,
    title,
    titleSource: title ? "ax" : "ax-empty",
    isMinimized: false,
    isFullscreen: false,
    spaceIds: [1],
    onScreen: true,
    resolved: true,
    foundBy: "kAXWindows",
    ...extra,
  };
}

export function app(pid: number, name: string, extra: Partial<HelperApp> = {}): HelperApp {
  return { pid, name, isHidden: false, bundleId: `com.test.${name.toLowerCase()}`, ...extra };
}

export function list(apps: HelperApp[], windows: HelperWindow[], visible = [1, 7]): WindowList {
  return {
    generatedAt: "2026-09-30T00:00:00Z",
    elapsedMs: 100,
    spaces: { available: true, visibleSpaceIds: visible, displays: [] },
    apps,
    windows,
    excludedCount: 0,
    warnings: [],
  };
}

/** Edge with 4 windows, Finder with 1, Mail hidden with 1 minimized. */
export function sample(): WindowList {
  return list(
    [app(10, "Microsoft Edge"), app(20, "Finder"), app(30, "Mail", { isHidden: true })],
    [
      win(10, 101, "Inbox - Outlook - Microsoft Edge", { zIndex: 1 }),
      win(10, 102, "Budget 2027 - Excel - Microsoft Edge", { onScreen: false, spaceIds: [5] }),
      win(10, 103, "Budget review - Microsoft Edge", { isMinimized: true, onScreen: false, spaceIds: [5, 1] }),
      win(10, 104, "Raycast Store - Microsoft Edge", { zIndex: 0, spaceIds: [7] }),
      win(20, 201, "Downloads", { zIndex: 2 }),
      win(30, 301, "All Inboxes", { isMinimized: true, onScreen: false }),
    ],
  );
}
