import { API_BASE, CDN_BASE } from "./types";

const DEFAULT_WISHLIST_IMAGE = `${API_BASE}/wishlist-images/wishlist.webp`;
const DEFAULT_ITEM_IMAGE = `${API_BASE}/products/default.webp`;

export function wishlistImageUrl(image: string | null): string {
  return resolveImage(image, "wishlists") ?? DEFAULT_WISHLIST_IMAGE;
}

export function itemImageUrl(image: string | null): string {
  return resolveImage(image, "items") ?? DEFAULT_ITEM_IMAGE;
}

function resolveImage(image: string | null, kind: "items" | "wishlists"): string | undefined {
  if (!image) return undefined;
  if (image.startsWith("http://") || image.startsWith("https://")) return image;
  // Wishlist preset images live as static assets in the Next.js public folder
  // (see lib/client/wishlist.ts:getImageDisplayProps). Items don't support
  // presets — their schema rejects non-URL strings, so this branch is
  // wishlists-only in practice.
  if (image.startsWith("preset:")) {
    const id = image.slice("preset:".length);
    return `${API_BASE}/wishlist-images/${id}.webp`;
  }
  // Otherwise it's an R2 storage key. The production URL pattern is
  // ${CDN_BASE}/wishapp/{wishlists|items}/full/{filename} — see
  // lib/server/image-storage.ts:getWishlist(Item)?ImageUrl.
  return `${CDN_BASE}/wishapp/${kind}/full/${image}`;
}

export function formatPrice(price: number | null, currency: string): string | undefined {
  if (price == null) return undefined;
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(price);
  } catch {
    return `${price} ${currency}`;
  }
}
