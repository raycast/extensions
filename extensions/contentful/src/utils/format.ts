import { Color } from "@raycast/api";

/**
 * Format content type ID to display name
 * Converts camelCase or snake_case to Title Case
 * @param contentTypeId - Content type ID
 * @returns Formatted content type name
 */
export function formatContentType(contentTypeId: string): string {
  // Handle camelCase
  const withSpaces = contentTypeId
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/-/g, " ");

  // Capitalize each word
  return withSpaces
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Create subtitle text for entry list item
 * @param spaceName - Space name
 * @param contentType - Content type ID or name
 * @returns Formatted subtitle string
 */
export function formatSubtitle(spaceName: string, contentType: string): string {
  const formattedContentType = formatContentType(contentType);
  return `${spaceName} · ${formattedContentType}`;
}

/**
 * Simple hash function for strings
 * @param str - String to hash
 * @returns Hash number
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    // Multiply by 32 (2^5) and subtract hash, then add character code
    hash = hash * 32 - hash + char;
    // Keep hash within safe integer range
    hash %= Number.MAX_SAFE_INTEGER;
  }
  return Math.abs(hash);
}

/**
 * Get a consistent color for a content type ID
 * Uses hash function to deterministically map content type IDs to Raycast colors
 * @param contentTypeId - Content type ID
 * @returns Raycast Color
 */
export function getContentTypeColor(contentTypeId: string): Color {
  const colors = [
    Color.Blue,
    Color.Green,
    Color.Orange,
    Color.Purple,
    Color.Red,
    Color.Yellow,
    Color.Magenta,
  ];

  const hash = simpleHash(contentTypeId);
  const index = hash % colors.length;
  return colors[index];
}
