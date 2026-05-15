export interface SavedGame {
  id: string;
  title: string;
  slug: string;
  type?: string | null;
}

export interface GameSearchResult extends SavedGame {
  mature?: boolean;
  type?: string | null;
}

export interface Price {
  amount: number;
  currency?: string;
}

export interface Shop {
  name?: string;
}

export interface Deal {
  url?: string;
  cut: number;
  price: Price;
  regular: Price;
  shop: Shop;
}

export interface BundleGame {
  id?: string | number;
  name?: string;
  title?: string;
}

export interface BundleTier {
  name?: string;
  price?: Price;
  games: BundleGame[];
}

export interface BundleInfo {
  title?: string;
  page?: { name?: string };
  url?: string;
  details?: string;
  note?: string;
  expiry?: string;
  created?: string;
  timestamp?: string;
  publish?: string;
  tiers: BundleTier[];
}

export interface OverviewItem {
  id?: string | number;
  current?: Deal;
  bundles?: number | { count?: number } | BundleInfo[];
}

export type OverviewResponse =
  | OverviewItem[]
  | Record<string, OverviewItem | OverviewItem[]>;

export interface HistoryPoint {
  timestamp: string;
  deal?: { price?: Price };
  shop?: Shop;
}

export interface HistoryLow {
  price?: Price;
  amount?: number;
  currency?: string;
}

export interface SteamSearchItem {
  id: number;
  name: string;
}

export interface SteamSearchResponse {
  items?: SteamSearchItem[];
}

export interface SteamData {
  header_image?: string;
  genres?: { description: string }[];
  release_date?: { date?: string };
  short_description?: string;
  steam_appid?: number;
}

export interface SteamAppDetailsResponse {
  [appId: string]: { data?: SteamData } | undefined;
}

export interface DetailData {
  steamData: SteamData | null;
  realBundles: BundleInfo[];
  deals: Deal[];
  historyLow: HistoryLow | null;
  overview: OverviewItem | null;
  historyChart: HistoryPoint[];
  lastChecked: number | null;
}

export interface BundleValue {
  type: "better" | "value";
  message: string;
  tier: BundleTier;
  bundle: BundleInfo;
}

export function flattenOverviewResponse(res: OverviewResponse): OverviewItem[] {
  if (Array.isArray(res)) {
    return res;
  }

  return Object.values(res).flatMap((value) =>
    Array.isArray(value) ? value : [value],
  );
}
