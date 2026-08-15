/**
 * Sanitizes and validates a URL to ensure it uses safe protocols
 * @param url - URL string to sanitize
 * @returns Normalized URL string
 * @throws Error if URL is invalid or uses disallowed protocol
 */
export function sanitizeUrl(url: string): string {
  try {
    const parsedUrl = new URL(url);

    // Only allow HTTP and HTTPS protocols
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new Error(`Disallowed protocol: ${parsedUrl.protocol}`);
    }

    // Return normalized URL
    return parsedUrl.toString();
  } catch (error) {
    throw new Error(`Invalid URL: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Sanitizes profile input by removing @ prefix, trimming whitespace, and URL encoding
 * @param profile - Profile name/username to sanitize
 * @returns URL-encoded profile string
 */
export function sanitizeProfileInput(profile: string): string {
  // Remove @ symbol if present
  let sanitized = profile.replace(/^@/, "");

  // Remove whitespace
  sanitized = sanitized.trim();

  // URL encode for safety
  return encodeURIComponent(sanitized);
}

/**
 * Validates that a profile input is not empty after trimming
 * @param profile - Profile name/username to validate
 * @returns True if profile is valid, false otherwise
 */
export function validateProfileInput(profile: string): boolean {
  if (!profile || profile.trim().length === 0) {
    return false;
  }

  // Add other validation rules as needed
  return true;
}
