export const SITE = "https://macbrowse.com";

// Names the extension, so Mac Browse can tell it from scrapers and let it through.
export const HEADERS = { "User-Agent": "Mozilla/5.0 (Macintosh; Mac OS X) Raycast MacBrowse-Extension/1.0" };

export type PriceType = "free" | "freemium" | "paid" | "subscription";

/** One app as /api/search returns it. Only the fields the extension reads. */
export type App = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  category: string;
  icon: { url: string } | null;
  priceType: PriceType;
  domain: string;
  url: string;
  href: string;
  featured: boolean;
};

export type SearchResponse = { featured: App[]; items: App[]; latest?: App[] };
export type CategoryResponse = { items: App[]; total: number; page: number; pages: number };

export const CATEGORIES: Record<string, string> = {
  business: "Business",
  "developer-tools": "Developer Tools",
  education: "Education",
  entertainment: "Entertainment",
  finance: "Finance",
  games: "Games",
  "graphics-design": "Graphics & Design",
  "health-fitness": "Health & Fitness",
  lifestyle: "Lifestyle",
  medical: "Medical",
  music: "Music",
  news: "News",
  "photo-video": "Photo & Video",
  productivity: "Productivity",
  reference: "Reference",
  "social-networking": "Social Networking",
  utilities: "Utilities",
};

export const PRICES: Record<PriceType, string> = {
  free: "Free",
  freemium: "Freemium",
  paid: "Paid",
  subscription: "Subscription",
};

export const absolute = (path: string) => (path.startsWith("http") ? path : `${SITE}${path}`);

export const pageUrl = (app: App) => absolute(app.href);

export const categoryLabel = (key: string) => CATEGORIES[key] ?? key;
