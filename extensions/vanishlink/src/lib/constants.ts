export const TIME_CONSTANTS = {
  ONE_MINUTE_MS: 1_000 * 60,
  ONE_HOUR_MS: 1_000 * 60 * 60,
  ONE_DAY_MS: 1_000 * 60 * 60 * 24,
  DEFAULT_EXPIRY_DAYS: 14, // Match package.json default of "2week"
} as const;

export const EXPIRY_DAYS_MAP = {
  "1day": 1,
  "1week": 7,
  "2week": 14,
  "1month": 30,
  "3month": 90,
  "6month": 180,
  "1year": 365,
} as const;
