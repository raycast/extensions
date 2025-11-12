import type { EntryFields } from "../types/contentful";

/**
 * Common field names used for titles in Contentful entries
 */
const TITLE_FIELD_CANDIDATES = [
  "title",
  "name",
  "internalName",
  "displayName",
  "label",
  "heading",
];

/**
 * Extract a display title from entry fields
 * Tries common field names in order, falls back to entry ID
 * @param fields - Entry fields object
 * @param entryId - Entry ID to use as fallback
 * @returns Display title string
 */
export function extractEntryTitle(
  fields: EntryFields,
  entryId: string
): string {
  // Try each candidate field in order
  const foundField = TITLE_FIELD_CANDIDATES.find((fieldName) => {
    const value = fields[fieldName];
    return typeof value === "string" && value.trim().length > 0;
  });

  if (foundField && typeof fields[foundField] === "string") {
    return fields[foundField] as string;
  }

  // Fallback to entry ID
  return entryId;
}

/**
 * Build Contentful Web App URL for an entry
 * @param spaceId - Space ID
 * @param environment - Environment name
 * @param entryId - Entry ID
 * @returns Full URL to entry in Contentful Web App
 */
export function buildWebAppUrl(
  spaceId: string,
  environment: string,
  entryId: string
): string {
  return `https://app.contentful.com/spaces/${spaceId}/environments/${environment}/entries/${entryId}`;
}

/**
 * Format ISO date string to human-readable format
 * @param isoDate - ISO 8601 date string
 * @returns Formatted date string (e.g., "Jan 15, 2024")
 * @internal
 */
function formatDate(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return isoDate;
  }
}

/**
 * Format relative time from ISO date string
 * @param isoDate - ISO 8601 date string
 * @returns Relative time string (e.g., "2 days ago")
 */
export function formatRelativeTime(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) {
      return "Just now";
    }
    if (diffMins < 60) {
      return `${diffMins} ${diffMins === 1 ? "minute" : "minutes"} ago`;
    }
    if (diffHours < 24) {
      return `${diffHours} ${diffHours === 1 ? "hour" : "hours"} ago`;
    }
    if (diffDays < 30) {
      return `${diffDays} ${diffDays === 1 ? "day" : "days"} ago`;
    }
    return formatDate(isoDate);
  } catch {
    return isoDate;
  }
}
