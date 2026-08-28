import { API_BASE, CDN_BASE } from "./constants";

const DEFAULT_WISHLIST_IMAGE = `${API_BASE}/wishlist-images/wishlist.webp`;
const DEFAULT_ITEM_IMAGE = `${API_BASE}/products/default.webp`;

export function wishlistImageUrl(image: string | null): string {
  return resolveImage(image, "wishlists") ?? DEFAULT_WISHLIST_IMAGE;
}

export function itemImageUrl(image: string | null): string {
  return resolveImage(image, "items") ?? DEFAULT_ITEM_IMAGE;
}

/**
 * A markdown image capped at `height`. Item images can be external URLs that
 * already carry a query string, so the separator can't be a bare `?`.
 */
export function imageMarkdown(alt: string, url: string, height = 200): string {
  const separator = url.includes("?") ? "&" : "?";
  return `![${alt}](${url}${separator}raycast-height=${height})`;
}

/**
 * Mirrors `lib/client/wishlist.ts:getImageDisplayProps` and
 * `:getItemImageDisplayProps` in the main app. Keep them in sync.
 */
function resolveImage(image: string | null, kind: "items" | "wishlists"): string | undefined {
  if (!image) return undefined;
  // Wishlist preset images live as static assets in the Next.js public folder.
  // Items don't support presets: their schema rejects non-URL strings, so this
  // branch is wishlists-only in practice.
  if (image.startsWith("preset:")) {
    const id = image.slice("preset:".length);
    return `${API_BASE}/wishlist-images/${id}.webp`;
  }
  // Scraped product images. The web app upgrades http to https before display,
  // so a stored http image must not reach Raycast as-is.
  if (image.startsWith("https://") || image.startsWith("http://")) {
    return image.replace(/^http:\/\//i, "https://");
  }
  // A public asset served by Next.js rather than a storage key.
  if (image.startsWith("/")) return `${API_BASE}${image}`;
  // Otherwise it's an R2 storage key. The production URL pattern is
  // ${CDN_BASE}/wishapp/{wishlists|items}/full/{filename}, see
  // lib/server/image-storage.ts:getWishlist(Item)?ImageUrl.
  return `${CDN_BASE}/wishapp/${kind}/full/${image}`;
}
