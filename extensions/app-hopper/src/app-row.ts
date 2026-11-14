import type { BrowserConfig, BrowserSummary } from "./browsers/types";
import type { BrowserSnapshot } from "./browsers/snapshot";
import { getAppWindowEvidence, type AppWindowData, type BrowserWindowEvidence } from "./app-window-evidence";
import { getSpaceLabel } from "./helpers/window-presentation";
import type { AppGroup, AXWindow } from "./windows";

export type AppRowData = AppWindowData;
export type AppRowTarget =
  | { kind: "application"; title: "Show Application" | "Activate Application" }
  | { kind: "browser"; snapshot: BrowserSnapshot }
  | { kind: "ax-window"; window: AXWindow }
  | { kind: "ax-windows"; windows: AXWindow[] }
  | { kind: "windows" };

interface AppRow {
  browser?: BrowserConfig;
  subtitle: string;
  space?: string;
  target: AppRowTarget;
}

function browserSubtitle(summary: BrowserSummary | undefined, nativeCount: number): string {
  if (summary?.windows === 1 && summary.tabs !== undefined) {
    return `${summary.tabs} ${summary.tabs === 1 ? "tab" : "tabs"}`;
  }
  const count = summary?.windows ?? nativeCount;
  return count > 1 ? `${count} windows` : "";
}

function browserRow(app: AppGroup, evidence: BrowserWindowEvidence): AppRow {
  const { summary, windows } = evidence.snapshot;
  const count = summary?.windows ?? windows?.length ?? app.windows.length;
  const spaceWindows = windows ?? app.windows;
  let space = spaceWindows.length === 1 ? getSpaceLabel(spaceWindows[0]) : undefined;
  if (summary && summary.windows !== 1) space = undefined;
  return {
    browser: evidence.config,
    subtitle: browserSubtitle(summary, app.windows.length),
    space,
    target:
      count === 0
        ? { kind: "application", title: "Show Application" }
        : { kind: "browser", snapshot: evidence.snapshot },
  };
}

function fallbackTarget(app: AppGroup, windows: AXWindow[], resolved: boolean): AppRowTarget {
  if (resolved) {
    if (windows.length === 1) return { kind: "ax-window", window: windows[0] };
    if (windows.length > 1) return { kind: "ax-windows", windows };
    return { kind: "application", title: "Show Application" };
  }
  const title = app.windows.length === 0 ? "Show Application" : "Activate Application";
  return { kind: "application", title };
}

/** Resolve one navigation target; text and actions use the same window evidence. */
export function getAppRow(app: AppGroup, data: AppRowData): AppRow {
  const evidence = getAppWindowEvidence(app, data);
  const browser = evidence.browser?.config;
  if (evidence.browser?.hasNavigation) return browserRow(app, evidence.browser);

  if (evidence.accessibility.isOnlySource) {
    const { resolved, windows } = evidence.accessibility;
    return {
      browser,
      subtitle: resolved && windows.length > 1 ? `${windows.length} windows` : "",
      space: resolved && windows.length === 1 ? getSpaceLabel(windows[0]) : undefined,
      target: fallbackTarget(app, windows, resolved),
    };
  }

  const singleWindow = app.windows.length === 1 ? app.windows[0] : undefined;
  return {
    browser,
    subtitle: app.windows.length > 1 ? `${app.windows.length} windows` : "",
    space: singleWindow ? getSpaceLabel(singleWindow) : undefined,
    target: singleWindow ? { kind: "application", title: "Activate Application" } : { kind: "windows" },
  };
}
