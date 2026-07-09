export const API_BASE = "https://www.getwish.app";
export const CDN_BASE = "https://cdn.getwish.app";

export type Wishlist = {
  id: string;
  shareUrl: string;
  title: string;
  description: string | null;
  image: string | null;
  defaultCurrency: string;
  hideReservations: boolean;
  _count: { items: number; followers: number };
};

export type WishlistsResponse = {
  success: true;
  ownedWishlists: Wishlist[];
  sharedWishlists: Wishlist[];
};

export type WishlistItem = {
  id: string;
  title: string;
  description: string | null;
  image: string | null;
  price: number | null;
  currency: string;
  link: string | null;
  quantity: number;
  priorityWish: boolean;
  reservations: { id: string; quantity: number; user: { id: string; name: string } }[];
};

export type WishlistDetailResponse = {
  success: true;
  wishlist: Wishlist & {
    user: { id: string; name: string; image: string | null };
    items: WishlistItem[];
  };
};

export type ProductInfo = {
  title?: string;
  price?: number;
  currency?: string;
  image?: string;
};

export type ProductInfoResponse = {
  success: true;
  data: ProductInfo;
};

export type CreateItemInput = {
  title: string;
  currency: string;
  priorityWish: boolean;
  link?: string;
  price?: number;
  image?: string; // External URL (pasted or scraped from a product page)
  imageKey?: string; // R2 storage filename (returned by /api/v1/upload/items)
  description?: string;
  quantity?: number;
};
