export type MaxViews = 0 | 1 | 3 | 5 | 10;
export type Expiry = "1h" | "24h" | "7d" | "30d";

export const EXPIRY_SECONDS: Record<Expiry, number> = {
  "1h": 3600,
  "24h": 86400,
  "7d": 604800,
  "30d": 2592000,
};

export const VALID_VIEWS: readonly MaxViews[] = [0, 1, 3, 5, 10];
export const VALID_EXPIRY: readonly Expiry[] = ["1h", "24h", "7d", "30d"];
