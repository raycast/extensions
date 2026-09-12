import { HOST_URL } from "../constants";
import { Topic } from "../types";
import { cleanText } from "./textUtils";

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
  return `${HOST_URL}topics/${slug}`;
}
