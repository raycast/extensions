import { isWindows } from "./platform";
import * as applescript from "./applescript";
import * as windows from "./windows-browser";
import type { HeliumTabRef } from "./applescript-parser";
import type { Tab } from "../types";

/**
 * Platform dispatcher for everything that drives the Helium application.
 *
 * Commands and actions import from here rather than from `applescript.ts` or
 * `windows-browser.ts` directly, so adding behavior means adding it to both
 * implementations instead of leaking an OS check into the UI layer.
 *
 * Capability gap: Chromium exposes no scripting interface on Windows. Tab
 * enumeration comes from the Browser Extension there, switching goes through
 * the accessibility tree, and closing a specific tab has no equivalent at all —
 * see `isTabCloseAvailable`.
 */

/**
 * Whether a specific tab can be closed from outside the browser. macOS-only,
 * via Helium's AppleScript dictionary.
 */
export const isTabCloseAvailable = !isWindows;

const TAB_CLOSE_UNAVAILABLE = "Closing Helium tabs is only available on macOS";

export async function openUrlInHelium(url: string): Promise<void> {
  return isWindows ? windows.openUrlInHelium(url) : applescript.openUrlInHelium(url);
}

/**
 * Open a new tab on Helium's new tab page. Each platform reaches it
 * differently — see the implementations — so callers must not hardcode
 * `chrome://new-tab-page/` themselves.
 */
export async function createNewTab(): Promise<void> {
  return isWindows ? windows.createNewTab() : applescript.createNewTab();
}

export async function createNewWindow(): Promise<void> {
  return isWindows ? windows.createNewWindow() : applescript.createNewWindow();
}

export async function createNewIncognitoWindow(): Promise<void> {
  return isWindows ? windows.createNewIncognitoWindow() : applescript.createNewIncognitoWindow();
}

/**
 * Enumerate open tabs. Empty on Windows — `fetchBrowserTabs` sources tabs from
 * the Browser Extension there instead.
 */
export async function listHeliumTabs(): Promise<HeliumTabRef[]> {
  return isWindows ? [] : applescript.listHeliumTabs();
}

/**
 * Focus an already open tab.
 *
 * macOS addresses it by Helium's stable AppleScript tab id. Windows has no such
 * handle, so it matches on the tab title through the accessibility tree; when
 * that finds nothing the caller is expected to fall back to opening the URL.
 */
export async function switchToTab(tab: Tab): Promise<boolean> {
  return isWindows ? windows.switchToTabByTitle(tab.title) : applescript.switchToHeliumTabById(tab.id);
}

export async function closeHeliumTabById(heliumId: string): Promise<boolean> {
  if (isWindows) throw new Error(TAB_CLOSE_UNAVAILABLE);
  return applescript.closeHeliumTabById(heliumId);
}
