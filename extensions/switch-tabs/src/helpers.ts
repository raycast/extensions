import { Cache, Icon, Image, Color } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { execFileSync } from "child_process";

export const BROWSER_COLORS: Record<string, Record<string, string>> = {
  edge: {
    grey: "#5F6368",
    blue: "#4285F4",
    magenta: "#CF87DA",
    yellow: "#F9AB00",
    navy: "#4A89BA",
    pink: "#EE5FB7",
    purple: "#B696FF",
    cyan: "#00ACC1",
    orange: "#FF6D00",
  },
  chrome: {
    grey: "#F1F3F4",
    blue: "#8AB4F8",
    red: "#F28B82",
    yellow: "#FDD663",
    green: "#81C995",
    pink: "#FF8bcb",
    purple: "#D7AEFB",
    cyan: "#78D9EC",
    orange: "#FCAD70",
  },
  brave: {
    grey: "#F1F3F4",
    blue: "#8AB4F8",
    red: "#F28B82",
    yellow: "#FDD663",
    green: "#81C995",
    pink: "#FF8bcb",
    purple: "#D7AEFB",
    cyan: "#78D9EC",
    orange: "#FCAD70",
  },
  helium: {
    grey: "#F1F3F4",
    blue: "#8AB4F8",
    red: "#F28B82",
    yellow: "#FDD663",
    green: "#81C995",
    pink: "#FF8bcb",
    purple: "#D7AEFB",
    cyan: "#78D9EC",
    orange: "#FCAD70",
  },
};

export function getTabGroupColor(colorName: string, browserType: string = "chrome"): string {
  const browserColors = BROWSER_COLORS[browserType] || BROWSER_COLORS.chrome;

  // Edge Mapping: API (green/red) -> Internal (navy/magenta)
  if (browserType === "edge") {
    if (colorName === "green") return browserColors["navy"];
    if (colorName === "red") return browserColors["magenta"];
  }

  return browserColors[colorName] || Color.SecondaryText;
}

export const cache = new Cache();

export function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

import { Keyboard, getPreferenceValues } from "@raycast/api";

// V100: Global Preference Memoization (Zero-Latency Access)
// We read preferences exactly ONCE at boot.
// This saves 200+ redundant API/Disk calls during a 25-tab render cycle.
export const prefs = Object.freeze(getPreferenceValues());

export function getActionShortcut(
  type:
    | "close"
    | "switch"
    | "searchNew"
    | "searchCurrent"
    | "cycleBrowser"
    | "cycleWindow"
    | "closeWindow"
    | "history"
    | "bookmarks"
    | "downloads"
    | "sessions"
    | "workspaces"
    | "searchToggle"
    | "clearSearch",
): Keyboard.Shortcut | undefined {
  const modifier = prefs[`${type}Modifier`];
  const key = prefs[`${type}Key`];

  if (!key) return undefined;

  const modifiers: Keyboard.KeyModifier[] = [];
  if (modifier && modifier !== "none") {
    modifiers.push(modifier as Keyboard.KeyModifier);
  }

  const keyLower = key.toLowerCase();
  if (keyLower === "enter" && modifiers.length === 0) return undefined;

  return { modifiers, key: keyLower as Keyboard.KeyEquivalent };
}

export function getTabIcon(tab: { url?: string; title?: string; favIconUrl?: string }) {
  // 1. Local Authority: Always use Green Globe for restricted browser URLs or "New Tab" title
  const url = tab.url?.toLowerCase() || "";
  const isNewTab =
    url.startsWith("edge://newtab") ||
    url.startsWith("chrome://newtab") ||
    url.startsWith("helium://newtab") ||
    tab.title === "New Tab" ||
    !tab.url;

  if (
    isNewTab ||
    url.startsWith("edge://") ||
    url.startsWith("chrome://") ||
    url.startsWith("helium://") ||
    url.startsWith("extension://") ||
    url === "about:blank"
  ) {
    return { source: Icon.Globe, tintColor: Color.Green };
  }

  // 2. Reader Mode: use preserved favIconUrl we set in tabMerger
  if (url.startsWith("read:") && tab.favIconUrl) {
    return { source: tab.favIconUrl, fallback: Icon.Globe, mask: Image.Mask.RoundedRectangle };
  }

  // 3. File Type Authority: Use Document icon for PDFs
  if (url.endsWith(".pdf") || url.includes(".pdf?")) {
    return Icon.Document;
  }

  // 4. Precise Manual Override: For sites where Google CDN is generic/weak
  const isNiche = url.includes("kickass-anime") || url.includes("notebooklm");
  if (isNiche && tab.favIconUrl) {
    return tab.favIconUrl;
  }

  return getFavicon(tab.url || "", { fallback: Icon.Globe, mask: Image.Mask.RoundedRectangle });
}

export function getBookmarkIcon(url: string | undefined) {
  if (!url) return Icon.Folder;
  return getFavicon(url, { fallback: Icon.Globe, mask: Image.Mask.RoundedRectangle });
}

export function formatTimeAgo(timestamp: number | undefined): string {
  if (!timestamp) return "";

  const ms = timestamp < 10000000000 ? timestamp * 1000 : timestamp;
  const seconds = Math.floor((Date.now() - ms) / 1000);
  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function formatBytes(bytes: number | undefined | null): string {
  if (bytes === undefined || bytes === null || bytes <= 0 || bytes === -1) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function getDownloadIcon(mime: string | undefined, fileIcon?: string, url?: string): Image.ImageLike | string {
  if (fileIcon) {
    return fileIcon;
  }
  if (mime?.startsWith("image/")) {
    return Icon.Image;
  }
  if (mime?.startsWith("text/") || mime?.includes("json") || mime?.includes("xml") || mime?.includes("javascript")) {
    return Icon.Document;
  }
  if (mime?.includes("zip") || mime?.includes("compressed") || mime?.includes("tar")) {
    return Icon.Document;
  }
  if (mime?.startsWith("video/")) {
    return Icon.Video;
  }
  if (mime?.startsWith("audio/")) {
    return Icon.AppWindowSidebarLeft; // Music icon
  }
  if (url) {
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.endsWith(".pdf")) {
      return Icon.Document;
    }
  }
  return Icon.Download;
}

export function getTabId(tab: { extId?: string | number; id?: string | number }): string | number | undefined {
  // 1. Prioritize real Extension ID (which now contains browser prefix, e.g. "edge-101")
  if (tab.extId !== undefined) return tab.extId;

  // 2. Fallback to parsing from stable ID
  if (typeof tab.id === "string") {
    return tab.id.replace("ext-", "");
  }
  return tab.id;
}

export function forceCopy(text: string): void {
  try {
    // clip.exe is a native Windows binary — no PowerShell cold start, instant execution.
    // It reads from stdin, so we pass the text via input option.
    execFileSync("clip.exe", [], { input: text, encoding: "utf8" });
  } catch (e) {
    console.error("forceCopy failed", e);
  }
}

export function resolveColor(value: string | undefined, defaultColor: Color | string): Color | string {
  if (!value) return defaultColor;
  const trimmed = value.trim();
  if (trimmed.startsWith("#")) {
    return trimmed;
  }
  // Case-insensitive match on Color enum
  const match = Color[trimmed as keyof typeof Color];
  if (match) return match as Color | string;

  const keys = Object.keys(Color);
  const found = keys.find((k) => k.toLowerCase() === trimmed.toLowerCase());
  if (found) return Color[found as keyof typeof Color] as Color | string;

  return trimmed;
}

export function resolveIcon(value: string | undefined, defaultIcon: Icon | string): Icon | string {
  if (!value) return defaultIcon;
  const trimmed = value.trim();

  // Split on dot and take the last part (e.g. "Icon.Waveform" -> "Waveform")
  const parts = trimmed.split(".");
  const keyName = parts[parts.length - 1];

  // Try case-sensitive match
  const match = Icon[keyName as keyof typeof Icon];
  if (match) return match;

  // Try case-insensitive match
  const iconKeys = Object.keys(Icon);
  const foundIcon = iconKeys.find((k) => k.toLowerCase() === keyName.toLowerCase());
  if (foundIcon) return Icon[foundIcon as keyof typeof Icon];

  return defaultIcon;
}

// V100: Global Status Indicators Memoization (Zero-Latency Rendering)
// Resolves the icons and colors exactly once at boot so that we don't scan 1000+ Icon keys
// during every single render frame of the tab list.
export const RESOLVED_ICONS = Object.freeze({
  pinned: resolveIcon(prefs.pinnedTabIcon, Icon.Pin),
  discarded: resolveIcon(prefs.discardedTabIcon, Icon.LivestreamDisabled),
  sleeping: resolveIcon(prefs.sleepingTabIcon, Icon.Moon),
});

export const RESOLVED_COLORS = Object.freeze({
  pinned: resolveColor(prefs.pinnedTabColor, Color.Blue),
  discarded: resolveColor(prefs.discardedTabColor, Color.SecondaryText),
  sleeping: resolveColor(prefs.sleepingTabColor, Color.SecondaryText),
});
