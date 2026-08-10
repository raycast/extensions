import { isWindows } from "./platform";
import * as applescript from "./applescript";
import * as windows from "./windows-browser";
import type { HeliumTabRef } from "./applescript-parser";

/**
 * Platform dispatcher for everything that drives the Helium application.
 *
 * Commands and actions import from here rather than from `applescript.ts` or
 * `windows-browser.ts` directly, so adding behavior means adding it to both
 * implementations instead of leaking an OS check into the UI layer.
 *
 * Capability gap: Chromium exposes no scripting interface on Windows, so tab
 * enumeration, switching, and closing exist on macOS only. The Windows
 * implementations below fail explicitly rather than pretending to succeed —
 * callers are expected to hide those actions (see `isTabControlAvailable`).
 */

/**
 * Whether the current platform can address an individual tab (switch to it,
 * close it). macOS-only, via Helium's AppleScript dictionary.
 */
export const isTabControlAvailable = !isWindows;

const TAB_CONTROL_UNAVAILABLE = "Helium tab control is only available on macOS";

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

export async function switchToHeliumTabById(heliumId: string): Promise<boolean> {
  if (isWindows) throw new Error(TAB_CONTROL_UNAVAILABLE);
  return applescript.switchToHeliumTabById(heliumId);
}

export async function closeHeliumTabById(heliumId: string): Promise<boolean> {
  if (isWindows) throw new Error(TAB_CONTROL_UNAVAILABLE);
  return applescript.closeHeliumTabById(heliumId);
}
