import { Icon, Image } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { URL } from "node:url";
import { FrontMatter } from "../types";

const IMAGE_PATH = /\.(png|jpe?g|gif|svg|webp|ico|bmp|avif)$/i;
const MASK = Image.Mask.RoundedRectangle;

type FaviconAttributes = Pick<FrontMatter, "source" | "favicon">;

/**
 * Parses an http(s) URL, defaulting to https:// when no scheme is given, so
 * that an override can be written as either "example.com" or
 * "https://example.com".
 */
function parseUrl(value: string, allowMissingScheme: boolean): URL | null {
  let url: URL;
  try {
    url = new URL(allowMissingScheme && !/^[a-z][a-z\d+\-.]*:/i.test(value) ? `https://${value}` : value);
  } catch {
    // Invalid URLs aren't treated as invalid bookmarks, so we don't want to
    // break here — the caller falls back to the generic icon instead.
    return null;
  }

  // Anything else (obsidian://, file://, mailto:, ...) has no favicon to show.
  return url.protocol === "http:" || url.protocol === "https:" ? url : null;
}

/**
 * Works out which URL a bookmark's icon comes from. The `favicon` attribute —
 * read from the frontmatter field named by the `faviconField` preference —
 * takes precedence over `source`. It can either point at an image (used as-is)
 * or at another website (whose favicon is used).
 */
function resolveFavicon({
  source,
  favicon,
}: FaviconAttributes): { url: URL; isImage: boolean; isOverride: boolean } | null {
  const override = favicon?.trim();
  if (override) {
    const url = parseUrl(override, true);
    if (url) return { url, isImage: IMAGE_PATH.test(url.pathname), isOverride: true };
  }

  const url = source ? parseUrl(source, false) : null;
  return url ? { url, isImage: false, isOverride: false } : null;
}

/**
 * Returns the favicon of the bookmarked website, falling back to the generic
 * link icon when no favicon can be found.
 */
export default function getFaviconIcon(attributes: FaviconAttributes): Image.ImageLike {
  const resolved = resolveFavicon(attributes);
  if (!resolved) return { source: Icon.Link, mask: MASK };

  return resolved.isImage
    ? { source: resolved.url.toString(), fallback: Icon.Link, mask: MASK }
    : getFavicon(resolved.url, { fallback: Icon.Link, mask: MASK });
}

/**
 * A short, human-readable explanation of where the icon comes from, used to
 * label the favicon preview on the save form.
 */
export function describeFaviconSource(attributes: FaviconAttributes): string {
  const resolved = resolveFavicon(attributes);
  if (!resolved) return "No favicon";

  if (resolved.isImage) {
    const fileName = resolved.url.pathname.split("/").pop() || resolved.url.hostname;
    return `${fileName} (custom image)`;
  }

  return resolved.isOverride ? `${resolved.url.hostname} (custom)` : resolved.url.hostname;
}
