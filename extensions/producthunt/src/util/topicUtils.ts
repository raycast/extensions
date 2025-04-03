import { Topic } from "../types";

/**
 * Cleans text by replacing Unicode escapes and HTML entities with their actual characters
 *
 * @param text The text to clean
 * @returns The cleaned text with proper character replacements
 */
export function cleanText(text: string | undefined | null): string {
  if (!text) return "";

  // Define replacement maps for more efficient processing
  const commonUnicodeEscapes: Record<string, string> = {
    "\\u0026": "&",
    "\\u003c": "<",
    "\\u003e": ">",
    "\\u0022": '"',
    "\\u0027": "'",
  };

  const htmlEntities: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
  };

  // Process text in a single pass where possible
  let cleaned = text;

  // Replace common Unicode escapes (using a single regex with alternation)
  cleaned = cleaned.replace(/\\u0026|\\u003c|\\u003e|\\u0022|\\u0027/g, (match) => commonUnicodeEscapes[match]);

  // Replace other Unicode escapes
  cleaned = cleaned.replace(/\\u([0-9a-fA-F]{4})/g, (_match, hex) => {
    const codePoint = parseInt(hex, 16);
    return isNaN(codePoint) ? _match : String.fromCharCode(codePoint);
  });

  // Replace HTML entities (using a single regex with alternation)
  cleaned = cleaned.replace(/&amp;|&lt;|&gt;|&quot;|&#39;/g, (match) => htmlEntities[match]);

  // Remove control characters and normalize whitespace in one final pass
  cleaned = cleaned
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\uFEFF]/g, "")
    .trim()
    .replace(/\s+/g, " ");

  return cleaned;
}

/**
 * Generates a URL-safe slug for a topic
 * Uses the slug from the API if available, otherwise generates one from the name
 *
 * @param topic The topic to generate a slug for
 * @returns A URL-safe slug string
 */
export function generateTopicSlug(topic: Topic): string {
  // Use the slug from the API if available
  if (topic.slug) {
    return topic.slug;
  }

  // Otherwise, generate a slug from the name
  // First, clean the name by decoding Unicode escapes
  const decodedName = cleanText(topic.name);

  // Then create a URL-safe slug
  const cleanName = decodedName
    // Replace special characters with hyphens (instead of removing them)
    .replace(/[&+]/g, "-and-")
    .replace(/[^\w\s-]/g, "-")
    // Replace Unicode control characters and zero-width spaces
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\uFEFF]/g, "")
    // Convert to lowercase
    .toLowerCase()
    // Replace spaces with hyphens
    .replace(/\s+/g, "-")
    // Collapse multiple hyphens
    .replace(/-+/g, "-")
    // Remove any remaining non-URL-safe characters
    .replace(/[^a-z0-9-]/g, "");

  return cleanName;
}

/**
 * Generates a Product Hunt topic URL
 *
 * @param topic The topic to generate a URL for
 * @returns The full Product Hunt URL for the topic
 */
export function generateTopicUrl(topic: Topic): string {
  const slug = generateTopicSlug(topic);
  return `https://www.producthunt.com/topics/${slug}`;
}
