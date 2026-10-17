type WishlistBase = {
  id: string;
  shareUrl: string;
  title: string;
  description: string | null;
  image: string | null;
  defaultCurrency: string;
  hideReservations: boolean;
};

export type Wishlist = WishlistBase & {
  // `items` excludes items already marked received, matching the list route's
  // `items: { where: { receivedAt: null } }`. `followers` is unfiltered.
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
  // Quantities only. The detail endpoint also returns each reserver's id and
  // name, but no client surfaces them: the web and mobile apps show reserved
  // counts and never say who reserved what, so a gift stays a surprise.
  reservations: { quantity: number }[];
};

export type WishlistDetailResponse = {
  success: true;
  // The detail route returns the items themselves, so it counts followers only.
  wishlist: WishlistBase & {
    _count: { followers: number };
    user: { id: string; name: string; image: string | null };
    items: WishlistItem[];
  };
};

export type ProductInfoResponse = {
  success: true;
  data: {
    title?: string;
    price?: number;
    currency?: string;
    image?: string;
  };
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
