import { runAppleScript } from "@raycast/utils";
import {
  accessibilityTrusted,
  appWindows,
  focusWindow,
  labelWithSuffix,
  openSidebar,
  sidebarRows,
} from "swift:../../../swift";
import type { AppWindows, Platform, SidebarRow } from "../tabs/model";

/** An app that stops responding must not hold up the whole list. */
const APPLESCRIPT_TIMEOUT = 4000;

/**
 * The tab level's Platform on macOS: AppleScript through Raycast, Accessibility through the Swift helper
 * (swift/Sources/JumperNative/Windows.swift, Sidebar.swift).
 */
export const macosTabPlatform: Platform = {
  runAppleScript: (script) => runAppleScript(script, { timeout: APPLESCRIPT_TIMEOUT }),
  accessibilityTrusted: () => accessibilityTrusted(),
  windows: async (bundleIds) => (await appWindows(bundleIds)) as AppWindows[],
  raiseWindow: (bundleId, index, title, tab) => focusWindow(bundleId, index, title, tab ?? null),
  sidebarRows: async (bundleId, query) => (await sidebarRows(bundleId, query.container, query.rowRole)) as SidebarRow[],
  openSidebarRow: (bundleId, query, name) =>
    openSidebar(bundleId, query.container, query.rowRole, name, query.namePattern ?? "", query.keyboard ?? false),
  labelWithSuffix: async (bundleId, suffix) => (await labelWithSuffix(bundleId, suffix)) ?? undefined,
};
