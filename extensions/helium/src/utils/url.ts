/**
 * Utility functions for URL detection and validation
 */

/**
 * Check if a string is a valid URL
 * Supports URLs with or without protocol, and localhost
 */
export function isURL(value: string): boolean {
  if (!value || value.trim().length === 0) {
    return false;
  }

  // Pattern to match URLs with or without protocol
  const urlPattern = /^(?:(?:https?|ftp):\/\/)?(?:\w+\.)+\w{2,}|localhost[:?\d]*(?:\/|$)/;
  return urlPattern.test(value.trim());
}

/**
 * Normalize a URL by adding https:// if no protocol is present
 */
export function normalizeURL(url: string): string {
  const trimmed = url.trim();

  // If it already has a protocol, return as-is
  if (/^\S+?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  // Add https:// prefix
  return `https://${trimmed}`;
}

/**
 * Extract domain from a URL for display purposes
 */
export function extractDomain(url: string): string {
  try {
    const normalized = normalizeURL(url);
    const urlObj = new URL(normalized);
    return urlObj.hostname;
  } catch {
    return url;
  }
}
