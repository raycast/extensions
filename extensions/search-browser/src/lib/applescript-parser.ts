import { SearchTab } from "./types";
import { getDomain } from "./utils";

export const FIELD_SEP = "\x1f";
export const RECORD_SEP = "\x1e";

function sanitizeAppleScriptText(value: string): string {
  const trimmed = value.trim();
  return trimmed === "missing value" ? "" : trimmed;
}

/**
 * Parse delimited AppleScript tab rows into SearchTab objects and enrich each tab
 * with window-level counts and active tab metadata.
 * Row format: windowId \x1f tabIndex \x1f space \x1f profile \x1f isActive \x1f title \x1f url \x1e
 */
export function parseAppleScriptTabs(raw: string): SearchTab[] {
  if (!raw || !raw.trim()) return [];
  const tabs: SearchTab[] = [];
  const records = raw.split(RECORD_SEP);

  for (const record of records) {
    const cleaned = record.replace(/^\r?\n/, "");
    if (!cleaned) continue;
    const parts = cleaned.split(FIELD_SEP);
    if (parts.length < 7) continue;

    const [windowIdStr, tabIndexStr, spaceRaw, profileRaw, isActiveStr, titleRaw, urlRaw] = parts;
    const url = sanitizeAppleScriptText(urlRaw);
    if (!url) continue;

    const windowId = Number.parseInt(windowIdStr, 10) || 0;
    const tabIndex = Number.parseInt(tabIndexStr, 10) || tabs.length + 1;
    const title = sanitizeAppleScriptText(titleRaw) || getDomain(url);
    const space = sanitizeAppleScriptText(spaceRaw) || "Unknown Space";
    const profile = sanitizeAppleScriptText(profileRaw) || "Personal";

    tabs.push({
      id: `live:${windowId}:${tabIndex}:${url}`,
      title,
      url,
      windowId,
      tabIndex,
      space,
      profile,
      isActive: isActiveStr.trim() === "1",
      source: "live",
    });
  }

  const windowStats = new Map<number, { count: number; activeIndex?: number; activeTitle?: string }>();
  for (const tab of tabs) {
    const stat = windowStats.get(tab.windowId) ?? { count: 0 };
    stat.count += 1;
    if (tab.isActive) {
      stat.activeIndex = tab.tabIndex;
      stat.activeTitle = tab.title;
    }
    windowStats.set(tab.windowId, stat);
  }

  const windowCount = windowStats.size;
  for (const tab of tabs) {
    const stat = windowStats.get(tab.windowId);
    tab.windowCount = windowCount;
    tab.windowTabCount = stat?.count ?? 1;
    tab.activeTabIndex = stat?.activeIndex;
    tab.activeTabTitle = stat?.activeTitle;
  }

  return tabs;
}

// macOS hardware virtual key codes for top-row digits 1..9 (Search Browser checks NSEvent.keyCode, not characters)
const DIGIT_KEY_CODES: Record<number, number> = {
  1: 18,
  2: 19,
  3: 20,
  4: 21,
  5: 23,
  6: 22,
  7: 26,
  8: 28,
  9: 25,
};

/**
 * Determine the macOS hardware key code for Search's fast Cmd+1..9 tab shortcut.
 * Cmd+1..8 jump directly to tabs 1..8; Cmd+9 jumps to the last tab.
 * Disabled if the user mapped Cmd+1..9 to Spaces or has pinned tabs in the space.
 */
export function getCommandNumberKeyCode(
  tab: Pick<SearchTab, "tabIndex" | "windowTabCount">,
  options: { spacesUseCommandNumbers: boolean; hasPinnedTabs: boolean }
): number | null {
  if (options.spacesUseCommandNumbers || options.hasPinnedTabs) {
    return null;
  }
  if (tab.tabIndex >= 1 && tab.tabIndex <= 8) {
    return DIGIT_KEY_CODES[tab.tabIndex] ?? null;
  }
  if (tab.windowTabCount && tab.windowTabCount >= 9 && tab.tabIndex === tab.windowTabCount) {
    return DIGIT_KEY_CODES[9];
  }
  return null;
}

/**
 * Compute how many Next Tab / Previous Tab menu clicks are needed to reach targetIndex from activeIndex.
 */
export function computeTabSwitchSteps(
  activeIndex: number,
  targetIndex: number
): { direction: "none" | "next" | "previous"; steps: number } {
  if (activeIndex <= 0 || targetIndex <= 0 || activeIndex === targetIndex) {
    return { direction: "none", steps: 0 };
  }
  const delta = targetIndex - activeIndex;
  return delta > 0 ? { direction: "next", steps: delta } : { direction: "previous", steps: -delta };
}

export interface SearchAppPrefs {
  linksLittle: boolean;
  linksReuseTabs: boolean;
  spacesUseCommandNumbers: boolean;
}

function readXmlPlistBool(xml: string, key: string): boolean | undefined {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `<key>${escapedKey}</key>\\s*<(true|false)\\s*/?>|<key>${escapedKey}</key>\\s*<integer>(\\d+)</integer>`
  );
  const match = pattern.exec(xml);
  if (!match) return undefined;
  if (match[1] === "true") return true;
  if (match[1] === "false") return false;
  if (match[2] !== undefined) return match[2] !== "0";
  return undefined;
}

/**
 * Parse XML1 plist output from `defaults export com.officecommun.search -`.
 * Defaults `linksLittle` to `true` when absent so we only take native `open -b` tab reuse
 * when Small Windows are explicitly disabled and "Go to a tab that has the page" is explicitly enabled.
 */
export function parseSearchAppPrefsXml(xml: string): SearchAppPrefs {
  return {
    linksLittle: readXmlPlistBool(xml, "links.little") ?? true,
    linksReuseTabs: readXmlPlistBool(xml, "links.little.tabs") ?? false,
    spacesUseCommandNumbers: readXmlPlistBool(xml, "spaces.commandNumbers") ?? false,
  };
}

/**
 * Extract only the actual osascript stderr message from a Node `execFile` error,
 * preventing AppleScript source code from leaking into error classification or user toasts.
 */
export function extractAppleScriptErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "stderr" in error) {
    const stderr = (error as { stderr?: unknown }).stderr;
    if (typeof stderr === "string" && stderr.trim()) {
      return stderr.trim();
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * Detect macOS AppleScript Automation permission denial (-1743 / "Not authorized").
 */
export function isAutomationPermissionError(error: unknown): boolean {
  const message = extractAppleScriptErrorMessage(error);
  return /\(-1743\)|not authorized to send apple events|not permitted to send apple events/i.test(message);
}

/**
 * Detect macOS Accessibility permission denial (-1002 / 1002 / -1719 / -25211 / assistive access).
 */
export function isAccessibilityPermissionError(error: unknown): boolean {
  const message = extractAppleScriptErrorMessage(error);
  return /not allowed assistive access|assistive access|\(-?1002\)|\(-1719\)|\(-25211\)|Privacy & Security → Accessibility/i.test(
    message
  );
}
