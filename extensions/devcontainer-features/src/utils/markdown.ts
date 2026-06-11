/**
 * Convert relative image paths in markdown to absolute GitHub raw URLs
 */
export function convertRelativeImagePaths(
  markdown: string,
  sourceInfo: string,
  featureId: string,
): string {
  const baseUrl = `https://raw.githubusercontent.com/${sourceInfo}/main/src/${featureId}`;

  // Match markdown image syntax: ![alt](path)
  return markdown.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, path) => {
    // Skip if already absolute URL
    if (path.startsWith("http://") || path.startsWith("https://")) {
      return match;
    }

    // Remove leading ./ if present
    const cleanPath = path.replace(/^\.\//, "");

    return `![${alt}](${baseUrl}/${cleanPath})`;
  });
}

/**
 * Strip first H1 heading from markdown (to avoid duplication with title)
 */
export function stripFirstH1(markdown: string): string {
  return markdown.replace(/^#\s+.+\n*/m, "").trim();
}

/**
 * Truncate text to a maximum length with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

/**
 * Escape special markdown characters in table cells
 */
export function escapeTableCell(text: string): string {
  return text.replace(/\|/g, "\\|").replace(/\n/g, " ").trim();
}

/**
 * Format enum values for display, truncating if too long
 */
export function formatEnumValues(
  values: string[],
  maxDisplay: number = 3,
): string {
  if (values.length <= maxDisplay) {
    return values.join(" \\| ");
  }
  const displayed = values.slice(0, maxDisplay).join(" \\| ");
  return `${displayed}, ... (+${values.length - maxDisplay} more)`;
}
