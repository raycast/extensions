import { Clipboard } from "@raycast/api";
import { urlLog } from "./logger";
import { getActiveTabUrl } from "./browser-extension";
import { getSelectedTextSafe, withTimeout } from "./host-api";

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
export function extractUrlFromText(text: string): string | null {
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
 * Finds a URL in text: the whole string if it is one, otherwise the first one embedded in it.
 *
 * `extracted` distinguishes the two for logging.
 */
export function findUrl(text: string): { url: string; extracted: boolean } | null {
  const trimmed = text.trim();
  if (isValidUrl(trimmed)) {
    return { url: trimmed, extracted: false };
  }

  const embedded = extractUrlFromText(trimmed);
  return embedded ? { url: embedded, extracted: true } : null;
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
  if (argumentUrl?.trim()) {
    const found = findUrl(argumentUrl);
    if (found) {
      urlLog.log("resolve:success", { source: "argument", url: found.url, extracted: found.extracted });
      return { url: found.url, source: "argument" };
    }

    // An explicit argument that isn't a URL is a user error — don't silently fall
    // through to the clipboard and open something they didn't ask for.
    urlLog.warn("resolve:invalid", { source: "argument", value: argumentUrl.trim() });
    return null;
  }

  // 2. Selected text
  // Bounded: getSelectedText rejects when nothing is selected, and is a known
  // hang on Windows. An unbounded await here is what trips Raycast's 5s IPC timeout.
  urlLog.log("resolve:try", { source: "selected text" });
  const selectedText = await getSelectedTextSafe();
  if (selectedText) {
    const found = findUrl(selectedText);
    if (found) {
      urlLog.log("resolve:success", { source: "selected text", url: found.url, extracted: found.extracted });
      return { url: found.url, source: "selected text" };
    }
  }
  urlLog.log("resolve:skip", { source: "selected text", reason: "no valid URL in selection" });

  // 3. Clipboard
  urlLog.log("resolve:try", { source: "clipboard" });
  const clipboardText = await withTimeout(() => Clipboard.readText(), undefined, undefined, "readText");
  if (clipboardText) {
    const found = findUrl(clipboardText);
    if (found) {
      urlLog.log("resolve:success", { source: "clipboard", url: found.url, extracted: found.extracted });
      return { url: found.url, source: "clipboard" };
    }
  }
  urlLog.log("resolve:skip", { source: "clipboard", reason: "no valid URL in clipboard" });

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
