import { getBrowserByAppName } from "./browsers/registry";
import { createBrowserSnapshot, type BrowserSnapshot } from "./browsers/snapshot";
import type { BrowserConfig, BrowserSummary, BrowserWindow } from "./browsers/types";
import type { AppGroup, AXWindow, Window } from "./windows";

export interface AppWindowData {
  /** Missing browser entries have not been resolved; an empty list is a completed observation. */
  browserTabs: Record<string, BrowserWindow[]>;
  browserCounts: Record<string, BrowserSummary>;
  /** Missing PID entries are unresolved, null means failure, and [] means no AX windows. */
  axWindowsByPid: Record<number, AXWindow[] | null>;
}

export interface BrowserWindowEvidence {
  config: BrowserConfig;
  snapshot: BrowserSnapshot;
  hasNavigation: boolean;
}

interface ProcessWindows {
  native: Window[];
  direct: Window[];
  accessibility: AXWindow[] | null | undefined;
}

export function getAppBrowser(app: AppGroup): BrowserConfig | undefined {
  return (
    app.windows.map((window) => getBrowserByAppName(window.app, app.bundlePath || window.bundlePath)).find(Boolean) ??
    getBrowserByAppName(app.name, app.bundlePath)
  );
}

function alreadyRepresented(window: AXWindow, direct: Window[]): boolean {
  return direct.some(
    (native) =>
      native.title !== "" &&
      native.title === window.title &&
      (!window.subrole || (native.subrole ?? "AXStandardWindow") === window.subrole),
  );
}

function windowSpaces(processes: ProcessWindows[], browser?: BrowserWindowEvidence): (number | undefined)[] {
  const windows = browser?.snapshot.windows;
  const count = browser?.snapshot.summary?.windows;
  if (windows !== undefined) {
    const spaces = windows.map((window) => window.space);
    if ((count ?? 0) > spaces.length) spaces.push(undefined);
    return spaces;
  }
  if (count === 0) return [];

  const spaces = processes.flatMap((process) => {
    const direct = process.direct.map((window) => window.space);
    if (process.direct.length > 0 && process.direct.length === process.native.length) return direct;
    const fallback = process.accessibility;
    return [...direct, ...(fallback ? fallback.map((window) => window.space) : [undefined])];
  });
  if ((count ?? 0) > spaces.length) spaces.push(undefined);
  return spaces;
}

/** Interpret source coverage once, retaining native, AX and companion target identities. */
export function getAppWindowEvidence(app: AppGroup, data: AppWindowData) {
  const config = getAppBrowser(app);
  const browser: BrowserWindowEvidence | undefined = config
    ? {
        config,
        snapshot: createBrowserSnapshot(config, {
          nativeWindows: app.windows,
          windows: data.browserTabs[config.id],
          summary: data.browserCounts[config.id],
        }),
        hasNavigation:
          app.windows.length > 0 ||
          data.browserTabs[config.id] !== undefined ||
          data.browserCounts[config.id] !== undefined,
      }
    : undefined;
  const processes = app.pids.map((pid): ProcessWindows => {
    const native = app.windows.filter((window) => window.pid === pid);
    return {
      native,
      direct: native.filter((window) => window["has-ax-reference"] !== false),
      accessibility: data.axWindowsByPid[pid],
    };
  });
  const directWindows = app.windows.filter((window) => window["has-ax-reference"] !== false);
  return {
    browser,
    directWindows,
    accessibility: {
      windows: processes.flatMap((process) => process.accessibility ?? []),
      searchWindows: processes.flatMap((process) =>
        (process.accessibility ?? []).filter((window) => !alreadyRepresented(window, process.direct)),
      ),
      resolved: processes.every((process) => Array.isArray(process.accessibility)),
      isOnlySource: directWindows.length === 0,
    },
    windowSpaces: windowSpaces(processes, browser),
  };
}
