import { getFavicon } from "@raycast/utils";
import type { Image } from "@raycast/api";

/**
 * Safely parse a URL string and return a tiny normalized object or null if invalid.
 */
export function safeParseUrl(raw?: string) {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    return { href: u.toString(), hostname: u.hostname };
  } catch {
    return null;
  }
}

/**
 * Try to get a favicon for a URL. Returns an ImageLike or undefined on failure.
 */
export function getFaviconForUrl(raw: string): Image.ImageLike | undefined {
  try {
    return getFavicon(raw, { size: 32 });
  } catch {
    return undefined;
  }
}
