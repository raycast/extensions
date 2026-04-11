import { Color, Icon } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import type { ItemType } from "../types";

/**
 * Returns the appropriate Raycast Icon for a page item type.
 */
export function getItemTypeIcon(itemType?: ItemType): Icon {
  switch (itemType) {
    case "article":
      return Icon.Document;
    case "webpage":
      return Icon.Globe;
    case "pdf":
      return Icon.BlankDocument;
    case "image":
      return Icon.Image;
    case "tweet":
      return Icon.Bird;
    case "github":
      return Icon.Code;
    default:
      return Icon.Globe;
  }
}

/**
 * Returns a tint color for an item type icon.
 */
export function getItemTypeColor(itemType?: ItemType): Color {
  switch (itemType) {
    case "article":
      return Color.Blue;
    case "pdf":
      return Color.Red;
    case "image":
      return Color.Green;
    case "tweet":
      return Color.Blue;
    case "github":
      return Color.Purple;
    default:
      return Color.PrimaryText;
  }
}

/**
 * Get a website favicon image for use as a List.Item icon.
 * Falls back to Icon.Globe if the URL is invalid.
 */
export function getPageFavicon(url: string) {
  try {
    return getFavicon(url, { fallback: Icon.Globe });
  } catch {
    return Icon.Globe;
  }
}

/**
 * Format a date string as a short relative or absolute date.
 * e.g., "Today", "Yesterday", "Mar 5", "Dec 12, 2024"
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const now = new Date();

  if (date.toDateString() === now.toDateString()) return "Today";

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays >= 2 && diffDays < 7) return `${diffDays}d ago`;

  const sameYear = date.getFullYear() === now.getFullYear();
  const month = date.toLocaleDateString("en-US", { month: "short" });
  const day = date.getDate();

  return sameYear
    ? `${month} ${day}`
    : `${month} ${day}, ${date.getFullYear()}`;
}

/**
 * Validate that a string looks like a URL.
 */
export function isValidUrl(str: string): boolean {
  try {
    const url = new URL(str);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Validate that an API key has the correct format.
 */
export function isValidApiKey(key: string): boolean {
  return key.startsWith("wsk_") && key.length > 8;
}
