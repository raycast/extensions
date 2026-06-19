/**
 * Figma URL detection and cleaning utilities.
 * Handles various Figma URL formats and removes unnecessary query parameters.
 */

/**
 * List of Figma URL path types we support.
 * - file - Standard file links
 * - design - New design links
 * - proto - Prototype links
 * - board - FigJam board links
 */
const FIGMA_PATH_TYPES = new Set(["file", "design", "proto", "board"]);

/**
 * Query parameters to preserve when cleaning URLs.
 * - node-id: Identifies the selected layer/frame (most important!)
 * - page-id: Identifies which page to show
 */
const PARAMS_TO_KEEP = ["node-id", "page-id"];

/**
 * Extracts and validates the key path segments from a Figma URL.
 * Expected format: /{type}/{fileKey}/optional-slug
 */
function getFigmaPathParts(
  pathname: string,
): { fileType: string; fileKey: string } | null {
  const pathParts = pathname.split("/").filter(Boolean);
  if (pathParts.length < 2) {
    return null;
  }

  const [fileType, fileKey] = pathParts;
  if (!FIGMA_PATH_TYPES.has(fileType) || !fileKey) {
    return null;
  }

  return { fileType, fileKey };
}

/**
 * Checks if a string is a valid Figma URL.
 * @param text - The text to check
 * @returns true if the text is a Figma URL
 */
export function isFigmaUrl(text: string): boolean {
  if (!text || typeof text !== "string") {
    return false;
  }

  try {
    const url = new URL(text.trim());

    // Must be figma.com domain (with or without www)
    const isFigmaDomain =
      url.hostname === "figma.com" || url.hostname === "www.figma.com";

    if (!isFigmaDomain) {
      return false;
    }

    // Must match supported path shape: /{type}/{fileKey}
    return getFigmaPathParts(url.pathname) !== null;
  } catch {
    // Not a valid URL
    return false;
  }
}

/**
 * Result of cleaning a Figma URL.
 */
export interface CleanResult {
  /** The cleaned URL */
  cleanedUrl: string;
  /** Whether any changes were made */
  wasModified: boolean;
  /** Human-readable summary of what was removed */
  summary: string;
}

/**
 * Cleans a Figma URL using aggressive shortening.
 *
 * Removes:
 * - www. prefix (figma.com works fine)
 * - File name slug (decorative, Figma ignores it)
 * - URL encoding of : in node-id (%3A → :)
 * - All tracking/session query params (t, fuid, share_link_id, etc.)
 *
 * Keeps:
 * - File type and key (required)
 * - node-id parameter (for layer/frame selection)
 * - page-id parameter (for page navigation)
 *
 * Example:
 * Before: https://www.figma.com/design/ABC123/My-Design-Name?node-id=123%3A456&t=abc&fuid=999
 * After:  https://figma.com/design/ABC123?node-id=123:456
 *
 * @param url - The Figma URL to clean
 * @returns The cleaned URL result
 */
export function cleanFigmaUrl(url: string): CleanResult {
  const trimmedUrl = url.trim();

  // Validate it's a Figma URL first
  if (!isFigmaUrl(trimmedUrl)) {
    throw new Error("Not a valid Figma URL");
  }

  const parsed = new URL(trimmedUrl);
  const originalLength = trimmedUrl.length;

  // 1. Remove www. prefix (figma.com works the same)
  const host = parsed.hostname.replace(/^www\./, "");

  // 2. Remove the file name slug from the path
  // Path format: /design/FILEKEY/optional-slug or /file/FILEKEY/optional-slug
  const figmaPath = getFigmaPathParts(parsed.pathname);
  if (!figmaPath) {
    throw new Error("Not a valid Figma URL");
  }

  // Rebuild path with only type and key (no slug)
  const cleanPath = `/${figmaPath.fileType}/${figmaPath.fileKey}`;

  // 3. Build clean query params (only keep node-id and page-id)
  const newParams = new URLSearchParams();

  for (const param of PARAMS_TO_KEEP) {
    const value = parsed.searchParams.get(param);
    if (value !== null) {
      newParams.set(param, value);
    }
  }

  // 4. Reconstruct minimal URL
  const queryString = newParams.toString();
  // Decode %3A back to : for shorter URLs (colons are valid in query strings)
  const cleanQuery = queryString.replace(/%3A/gi, ":");

  const cleanedUrl = cleanQuery
    ? `https://${host}${cleanPath}?${cleanQuery}`
    : `https://${host}${cleanPath}`;

  // Determine what changed
  const wasModified = cleanedUrl !== trimmedUrl;

  // Calculate characters saved for summary
  const savedChars = originalLength - cleanedUrl.length;

  let summary: string;
  if (!wasModified) {
    summary = "URL was already clean";
  } else if (savedChars > 0) {
    summary = `Shortened by ${savedChars} chars`;
  } else {
    summary = "URL normalized";
  }

  return {
    cleanedUrl,
    wasModified,
    summary,
  };
}

/**
 * Extracts key information from a Figma URL for display.
 * @param url - The Figma URL to parse
 * @returns Object with file key and node ID if present
 */
export function parseFigmaUrl(url: string): {
  fileKey: string | null;
  nodeId: string | null;
} {
  try {
    const parsed = new URL(url.trim());

    // Extract file key from pathname
    // Pathname format: /file/ABC123/File-Name or /design/ABC123/...
    const pathParts = parsed.pathname.split("/").filter(Boolean);
    const fileKey = pathParts.length >= 2 ? pathParts[1] : null;

    // Extract node ID from query params
    const nodeId = parsed.searchParams.get("node-id");

    return { fileKey, nodeId };
  } catch {
    return { fileKey: null, nodeId: null };
  }
}
