import { ProcessedTextData } from "../types/sefaria";
import { APP_CONSTANTS, REGEX_PATTERNS } from "../constants/app";

/**
 * Clean Sefaria text by removing HTML tags and entities
 */
export function cleanSefariaText(text: string | string[]): string {
  if (!text) return "";

  // Handle arrays of text (for multi-verse selections)
  if (Array.isArray(text)) {
    return text.map((t) => cleanSefariaText(t)).join(" ");
  }

  return (
    text
      // Remove all HTML tags completely
      .replace(REGEX_PATTERNS.HTML_TAGS, "")
      // Convert common HTML entities
      .replace(REGEX_PATTERNS.HTML_ENTITIES.NBSP, " ")
      .replace(REGEX_PATTERNS.HTML_ENTITIES.AMP, "&")
      .replace(REGEX_PATTERNS.HTML_ENTITIES.LT, "<")
      .replace(REGEX_PATTERNS.HTML_ENTITIES.GT, ">")
      .replace(REGEX_PATTERNS.HTML_ENTITIES.QUOT, '"')
      .replace(REGEX_PATTERNS.HTML_ENTITIES.APOS, "'")
      .replace(REGEX_PATTERNS.HTML_ENTITIES.APOS_ALT, "'")
      .replace(REGEX_PATTERNS.HTML_ENTITIES.HELLIP, "...")
      // Remove Hebrew-specific HTML entities
      .replace(REGEX_PATTERNS.HTML_ENTITIES.THINSP, "")
      .replace(REGEX_PATTERNS.HTML_ENTITIES.ENSP, " ")
      .replace(REGEX_PATTERNS.HTML_ENTITIES.EMSP, " ")
      // Remove Unicode control characters
      .replace(REGEX_PATTERNS.UNICODE_CONTROL, "")
      // Clean up extra whitespace
      .replace(REGEX_PATTERNS.WHITESPACE, " ")
      .trim()
  );
}

/**
 * Process English text to extract footnotes
 */
export function processEnglishText(text: string): ProcessedTextData {
  const footnotes: string[] = [];

  // Extract footnote content (text between asterisks)
  let cleanText = text.replace(REGEX_PATTERNS.FOOTNOTES.BETWEEN_ASTERISKS, (match, footnoteText) => {
    footnotes.push(footnoteText.trim());
    return ""; // Remove the footnote from main text
  });

  // Also handle footnotes at the end like "*Adonai-nissi I.e., "יהוה is my banner.""
  cleanText = cleanText.replace(REGEX_PATTERNS.FOOTNOTES.END_ASTERISK, (match, footnoteText) => {
    footnotes.push(footnoteText.trim());
    return "";
  });

  // Remove any standalone asterisks
  cleanText = cleanText.replace(REGEX_PATTERNS.FOOTNOTES.STANDALONE_ASTERISK, "");

  return {
    cleanText: cleanText.trim(),
    footnotes,
  };
}

/**
 * Add RTL markers to Hebrew text for proper display
 */
export function addRTLMarkers(text: string): string {
  if (!text) return "";
  return `${APP_CONSTANTS.TEXT.RTL_MARKER_START}${text}${APP_CONSTANTS.TEXT.RTL_MARKER_END}`;
}

/**
 * Extract a readable title from search result ID
 */
export function extractTitleFromId(id: string, fallbackIndex: number): string {
  return id.split(" (")[0] || `Search Result ${fallbackIndex + 1}`;
}

/**
 * Extract reference from search result ID
 */
export function extractReferenceFromId(id: string): string {
  return id.split(" (")[0] || id;
}

/**
 * Clean HTML tags from highlighted text
 */
export function cleanHighlightTags(text: string): string {
  return text.replace(REGEX_PATTERNS.BOLD_TAGS, "");
}

/**
 * Truncate text to a specified length with ellipsis
 */
export function truncateText(text: string, maxLength: number = APP_CONSTANTS.SEARCH.MAX_PREVIEW_LENGTH): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}
