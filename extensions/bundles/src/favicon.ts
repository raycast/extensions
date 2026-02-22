/**
 * URL utilities for website handling
 * Favicon fetching is handled by @raycast/utils getFavicon
 */

/**
 * Parse URL safely, returns undefined if invalid
 */
function parseUrl(url: string): URL | undefined {
  try {
    return new URL(url);
  } catch {
    return undefined;
  }
}

/**
 * Extract domain/hostname from URL for display
 */
export function extractDomain(url: string): string {
  const parsed = parseUrl(url);
  return parsed ? parsed.hostname.replace(/^www\./, "") : url;
}

/**
 * Validate if a string is a valid HTTP(S) URL
 */
export function isValidUrl(url: string): boolean {
  const parsed = parseUrl(url);
  return parsed ? parsed.protocol === "http:" || parsed.protocol === "https:" : false;
}

/**
 * Convert "dot" text to actual dots in URLs
 * Handles: discorddotcom → discord.com, jadotmt → ja.mt, githubdotcodotuk → github.co.uk
 */
function convertDotText(input: string): string {
  // Match "dot" surrounded by alphanumeric characters (case-insensitive)
  // This converts "discorddotcom" → "discord.com" but won't break actual words
  return input.replace(/([a-z0-9])dot([a-z0-9])/gi, "$1.$2");
}

/**
 * Normalize a URL (convert "dot" to ".", add https if missing, trim whitespace)
 * Examples:
 *   - discorddotcom → https://discord.com
 *   - jadotmt → https://ja.mt
 *   - githubdotcodotuk → https://github.co.uk
 */
export function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";

  // Convert "dot" text to actual dots
  const withDots = convertDotText(trimmed);

  // Add https:// if no protocol present
  return withDots.match(/^https?:\/\//i) ? withDots : `https://${withDots}`;
}

/**
 * Fetch the title of a webpage
 * Returns the page title or falls back to domain name
 */
export async function fetchWebsiteTitle(url: string): Promise<string> {
  const fallback = extractDomain(url);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    });

    clearTimeout(timeout);

    if (!response.ok) return fallback;

    const html = await response.text();

    // Try to extract title from <title> tag
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      const title = titleMatch[1].trim();
      // Clean up common suffixes and decode HTML entities
      const cleanTitle = title
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, " ");

      // Return title if it's not empty and not just the domain
      if (cleanTitle && cleanTitle.toLowerCase() !== fallback.toLowerCase()) {
        return cleanTitle;
      }
    }

    return fallback;
  } catch {
    return fallback;
  }
}
