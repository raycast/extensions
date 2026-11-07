import { Color, Icon, List } from "@raycast/api";
import { type HistoryItem, type Tab } from "./dia";
import { getFavicon } from "@raycast/utils";

/**
 * Escapes a string for safe use in AppleScript string literals.
 * Escapes backslashes and quotes.
 */
export function escapeAppleScriptString(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * Escapes special characters in SQL LIKE patterns to prevent SQL injection.
 * Escapes: %, _, \, and single quotes
 * Note: Backslashes are doubled for SQL string literals, then special chars are escaped
 */
export function escapeSQLLikePattern(pattern: string): string {
  return pattern.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_").replace(/'/g, "''");
}

export function getSafeFavicon(url: string): List.Item.Props["icon"] {
  const invalidSchemes = ["javascript:", "data:", "about:", "chrome:", "file:"];
  const urlLower = url.toLowerCase().trim();

  if (invalidSchemes.some((scheme) => urlLower.startsWith(scheme))) {
    return { source: Icon.Link, tintColor: Color.SecondaryText };
  }

  return getFavicon(url);
}

export function getSubtitle(url: string) {
  try {
    const { hostname } = new URL(url);
    // Remove leading 'www.' from hostname if present
    return hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * Tint for a space's label, from its Dia theme color. Nearly white colors are darkened in the light theme
 * and nearly black ones lightened in the dark theme, so the label stays visible. Neutral without a color.
 */
export function getSpaceTint(hex: string | undefined): Color.ColorLike {
  const match = hex?.match(/^#([0-9a-f]{6})$/i);
  if (!match) return Color.SecondaryText;
  const value = parseInt(match[1], 16);
  const rgb = [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const toHex = (channels: number[]) => `#${channels.map((c) => Math.round(c).toString(16).padStart(2, "0")).join("")}`;
  const color = toHex(rgb);
  if (luminance > 0.6) return { light: toHex(rgb.map((c) => c * 0.6)), dark: color };
  if (luminance < 0.03) return { light: color, dark: toHex(rgb.map((c) => c + (255 - c) * 0.5)) };
  return color;
}

const MAX_SPACE_TAG_LENGTH = 14;

/** Cuts a space name with an ellipsis so it fits in a tag. */
export function truncateSpaceName(name: string): string {
  return name.length > MAX_SPACE_TAG_LENGTH ? `${name.slice(0, MAX_SPACE_TAG_LENGTH - 1)}…` : name;
}

export type SpaceLabel = "name" | "dot";

/**
 * `spaceTint` adds the tab's space in the space color, as a name tag or a dot depending on `spaceLabel`.
 * Long names are cut with an ellipsis in the tag; the full name stays in the tooltip.
 */
export function getAccessories(
  tab: Tab,
  { spaceTint, spaceLabel = "name" }: { spaceTint?: Color.ColorLike; spaceLabel?: SpaceLabel } = {},
) {
  const accessories: List.Item.Accessory[] = [];
  if (tab.isFocused) {
    accessories.push({ icon: { source: Icon.Dot, tintColor: Color.Blue }, tooltip: "Focused tab" });
  }
  // Last, so the space label lines up on the right edge of every row
  if (tab.space && spaceTint) {
    if (spaceLabel === "dot") {
      accessories.push({ icon: { source: Icon.CircleFilled, tintColor: spaceTint }, tooltip: tab.space });
    } else {
      accessories.push({ tag: { value: truncateSpaceName(tab.space), color: spaceTint }, tooltip: tab.space });
    }
  }
  return accessories;
}

/**
 * Detects if input looks like a URL (has TLD or protocol).
 * Examples: "github.com", "https://foo.bar", "localhost:3000"
 */
export function isLikelyURL(str: string): boolean {
  const trimmed = str.trim();
  if (!trimmed || trimmed.includes(" ")) return false;
  if (/^\S+:\/\//.test(trimmed)) return true;
  if (/^localhost(:\d+)?/.test(trimmed)) return true;
  return /^[\w-]+(\.[\w-]+)+/.test(trimmed);
}

export function filterTabs(tabs: Tab[] | undefined, query: string) {
  if (!query || !tabs) return tabs;

  return tabs.filter(
    (tab) =>
      tab.title.toLowerCase().includes(query.toLowerCase()) || tab.url?.toLowerCase().includes(query.toLowerCase()),
  );
}

export function filterHistory(
  history: HistoryItem[] | undefined,
  openTabs: Tab[] | undefined,
): HistoryItem[] | undefined {
  if (!history) return history;
  if (!openTabs || openTabs.length === 0) return history;

  // Create a Set of open tab URLs for O(1) lookup performance
  const openTabUrls = new Set(openTabs.map((tab) => tab.url?.toLowerCase()).filter(Boolean));

  // Filter out history items that match open tabs
  return history.filter((item) => !openTabUrls.has(item.url.toLowerCase()));
}
