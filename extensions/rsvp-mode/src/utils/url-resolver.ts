import { Clipboard, getSelectedText } from "@raycast/api";
import { urlLog } from "./logger";
import { getActiveTabUrl } from "./browser-extension";

/**
 * Validates if a string is a valid URL
 */
export function isValidUrl(text: string): boolean {
  try {
    const url = new URL(text.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Extracts the first valid URL from text
 */
function extractUrlFromText(text: string): string | null {
  const urlPattern = /https?:\/\/[^\s]+/gi;
  const matches = text.match(urlPattern);

  if (!matches) return null;

  for (const match of matches) {
    const cleaned = match.replace(/[.,;!?)]+$/, "");
    if (isValidUrl(cleaned)) {
      return cleaned;
    }
  }

  return null;
}

/**
 * Resolves URL from multiple sources in priority order:
 * 1. Command argument
 * 2. Selected text (if valid URL)
 * 3. Clipboard (if valid URL)
 * 4. Browser extension (active tab)
 */
export async function resolveUrl(argumentUrl?: string): Promise<{ url: string; source: string } | null> {
  urlLog.log("resolve:start", { hasArgument: !!argumentUrl });

  // 1. Command argument
  if (argumentUrl && argumentUrl.trim()) {
    const trimmed = argumentUrl.trim();
    if (isValidUrl(trimmed)) {
      urlLog.log("resolve:success", { source: "argument", url: trimmed });
      return { url: trimmed, source: "argument" };
    }

    const extracted = extractUrlFromText(trimmed);
    if (extracted) {
      urlLog.log("resolve:success", { source: "argument", url: extracted, extracted: true });
      return { url: extracted, source: "argument" };
    }

    urlLog.warn("resolve:invalid", { source: "argument", value: trimmed });
    return null;
  }

  // 2. Selected text
  try {
    urlLog.log("resolve:try", { source: "selected text" });
    const selectedText = await getSelectedText();
    if (selectedText) {
      const trimmed = selectedText.trim();
      if (isValidUrl(trimmed)) {
        urlLog.log("resolve:success", { source: "selected text", url: trimmed });
        return { url: trimmed, source: "selected text" };
      }

      const extracted = extractUrlFromText(trimmed);
      if (extracted) {
        urlLog.log("resolve:success", { source: "selected text", url: extracted, extracted: true });
        return { url: extracted, source: "selected text" };
      }
    }
    urlLog.log("resolve:skip", { source: "selected text", reason: "not a valid URL" });
  } catch {
    urlLog.log("resolve:skip", { source: "selected text", reason: "unable to get selection" });
  }

  // 3. Clipboard
  try {
    urlLog.log("resolve:try", { source: "clipboard" });
    const clipboardText = await Clipboard.readText();
    if (clipboardText) {
      const trimmed = clipboardText.trim();
      if (isValidUrl(trimmed)) {
        urlLog.log("resolve:success", { source: "clipboard", url: trimmed });
        return { url: trimmed, source: "clipboard" };
      }

      const extracted = extractUrlFromText(trimmed);
      if (extracted) {
        urlLog.log("resolve:success", { source: "clipboard", url: extracted, extracted: true });
        return { url: extracted, source: "clipboard" };
      }
    }
    urlLog.log("resolve:skip", { source: "clipboard", reason: "not a valid URL" });
  } catch {
    urlLog.log("resolve:skip", { source: "clipboard", reason: "unable to read clipboard" });
  }

  // 4. Browser extension (active tab)
  urlLog.log("resolve:try", { source: "browser" });
  const activeTab = await getActiveTabUrl();
  if (activeTab && isValidUrl(activeTab.url)) {
    urlLog.log("resolve:success", { source: "browser", url: activeTab.url, tabId: activeTab.tabId });
    return { url: activeTab.url, source: "browser" };
  }
  urlLog.log("resolve:skip", { source: "browser", reason: "no active tab with valid URL or extension unavailable" });

  urlLog.warn("resolve:failed", { reason: "no valid URL found from any source" });
  return null;
}
