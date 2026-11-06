import { closeMainWindow, Icon, Keyboard, open } from "@raycast/api";
import { SearchMode, SearchResult } from "./types";

export function getSearchUrl(query: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

export function getAiSearchUrl(query: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}&udm=50`;
}

export function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export function normalizeNavigationUrl(rawUrl: string): string | null {
  if (!rawUrl || typeof rawUrl !== "string") {
    return null;
  }
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return null;
  }

  // Detect explicit URI schemes case-insensitively (RFC 3986)
  const schemeMatch = trimmed.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/);
  if (schemeMatch) {
    const scheme = schemeMatch[1].toLowerCase();
    // Reject every non-HTTP(S) explicit scheme (e.g. file:, javascript:, data:, ftp:)
    if (scheme !== "http" && scheme !== "https") {
      return null;
    }
    // Must be followed by "://"
    if (!/^https?:\/\//i.test(trimmed)) {
      return null;
    }
    try {
      const parsed = new URL(trimmed);
      if ((parsed.protocol === "http:" || parsed.protocol === "https:") && parsed.hostname) {
        return trimmed;
      }
    } catch {
      return null;
    }
    return null;
  }

  // Scheme-less destination (e.g. "github.com", "raycast.com/pricing")
  const urlWithHttps = `https://${trimmed}`;
  try {
    const parsed = new URL(urlWithHttps);
    if (parsed.protocol === "https:" && parsed.hostname && !parsed.hostname.startsWith(".")) {
      return urlWithHttps;
    }
  } catch {
    return null;
  }

  return null;
}

export async function executeNormalSearch(
  item: SearchResult,
  addHistory: (item: SearchResult) => Promise<void>,
  openBrowser: (url: string) => Promise<void> = open,
  closeWindow: () => Promise<void> = closeMainWindow,
) {
  const normalUrl = getItemNormalUrl(item);
  await addHistory({ ...item, url: normalUrl });
  await openBrowser(normalUrl);
  await closeWindow();
}

export async function executeAiSearch(
  item: SearchResult,
  addHistory: (item: SearchResult) => Promise<void>,
  openBrowser: (url: string) => Promise<void> = open,
  closeWindow: () => Promise<void> = closeMainWindow,
) {
  const aiUrl = getItemAiUrl(item);
  await addHistory({ ...item, url: getItemNormalUrl(item) });
  await openBrowser(aiUrl);
  await closeWindow();
}

export function getItemNormalUrl(item: SearchResult): string {
  if (item.isNavigation && item.url) {
    const safeUrl = normalizeNavigationUrl(item.url);
    return safeUrl ?? getSearchUrl(item.query);
  }
  return getSearchUrl(item.query);
}

export function getItemAiUrl(item: SearchResult): string {
  if (item.isNavigation && item.url) {
    const safeUrl = normalizeNavigationUrl(item.url);
    return safeUrl ?? getAiSearchUrl(item.query);
  }
  return getAiSearchUrl(item.query);
}

export function getItemUrl(item: SearchResult, isAiMode: boolean): string {
  return isAiMode ? getItemAiUrl(item) : getItemNormalUrl(item);
}

export function getIcon(item: SearchResult) {
  if (item.isHistory) {
    return Icon.Clock;
  }
  if (item.isNavigation) {
    return Icon.Link;
  }
  return Icon.MagnifyingGlass;
}

export const COPY_URL_SHORTCUT: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd"], key: "return" },
  Windows: { modifiers: ["ctrl"], key: "return" },
};

export interface ActionDescriptor {
  id: "open-normal" | "open-ai" | "copy-url" | "copy-suggestion" | "set-search-text";
  title: string;
  url?: string;
  content?: string;
  shortcut?: Keyboard.Shortcut;
  icon?: Icon;
}

export interface SearchModeActions {
  primaryAction: ActionDescriptor;
  secondaryAction: ActionDescriptor;
  alternateSearchAction: ActionDescriptor;
  copyUrlAction: ActionDescriptor;
  copySuggestionAction: ActionDescriptor;
  setSearchTextAction: ActionDescriptor;
  actionOrder: ActionDescriptor[];
  accessory: {
    icon: Icon;
    tooltip: string;
  };
}

export function getSearchModeActions(mode: SearchMode, item: SearchResult): SearchModeActions {
  const isAi = mode === "ai";
  const normalUrl = getItemNormalUrl(item);
  const aiUrl = getItemAiUrl(item);
  const copyUrl = isAi ? aiUrl : normalUrl;

  const openNormalAction: ActionDescriptor = {
    id: "open-normal",
    title: "Open in Browser",
    url: normalUrl,
    icon: Icon.ArrowRight,
    shortcut: isAi ? { modifiers: ["shift"], key: "return" } : undefined,
  };

  const openAiAction: ActionDescriptor = {
    id: "open-ai",
    title: "Search in AI Mode",
    url: aiUrl,
    icon: Icon.Stars,
    shortcut: !isAi ? { modifiers: ["shift"], key: "return" } : undefined,
  };

  const copyUrlAction: ActionDescriptor = {
    id: "copy-url",
    title: "Copy URL to Clipboard",
    content: copyUrl,
    shortcut: COPY_URL_SHORTCUT,
  };

  const copySuggestionAction: ActionDescriptor = {
    id: "copy-suggestion",
    title: "Copy Suggestion to Clipboard",
    content: item.query,
    shortcut: Keyboard.Shortcut.Common.Copy,
  };

  const setSearchTextAction: ActionDescriptor = {
    id: "set-search-text",
    title: "Set as Search Text",
    shortcut: { modifiers: ["shift"], key: "tab" },
    icon: Icon.MagnifyingGlass,
  };

  const primaryAction = isAi ? openAiAction : openNormalAction;
  const alternateSearchAction = isAi ? openNormalAction : openAiAction;

  const actionOrder = [primaryAction, copyUrlAction, alternateSearchAction, copySuggestionAction, setSearchTextAction];

  const accessory = isAi
    ? { icon: Icon.ArrowRight, tooltip: "Open in Browser (⇧↵)" }
    : { icon: Icon.Stars, tooltip: "Search in AI Mode (⇧↵)" };

  return {
    primaryAction,
    secondaryAction: copyUrlAction,
    alternateSearchAction,
    copyUrlAction,
    copySuggestionAction,
    setSearchTextAction,
    actionOrder,
    accessory,
  };
}
