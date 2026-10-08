import { Color } from "@raycast/api";

export const MAX_BODY_LENGTH = 5000;

export const DEFAULT_COLLECTION_NAME = "default";

export const COMMON_HEADER_KEYS = [
  "A-IM",
  "Accept",
  "Accept-Charset",
  "Accept-Encoding",
  "Accept-Language",
  "Authorization",
  "Cache-Control",
  "Connection",
  "Content-Length",
  "Content-Type",
  "Cookie",
  "Date",
  "Expect",
  "From",
  "Host",
  "If-Match",
  "If-Modified-Since",
  "Origin",
  "Pragma",
  "Range",
  "Referer",
  "TE",
  "User-Agent",
  "X-CSRF-Token",
  "X-Requested-With",
] as const;

// --- CONSTANTS AND ENUMS ---

/**
 * Defines HTTP methods and their associated colors.
 * This centralizes the configuration for each method.
 */
export const METHODS = {
  GET: { color: Color.Blue, bodyAllowed: false },
  POST: { color: Color.Green, bodyAllowed: true },
  PUT: { color: Color.Purple, bodyAllowed: true },
  PATCH: { color: Color.Yellow, bodyAllowed: true },
  DELETE: { color: Color.Red, bodyAllowed: false },
  GRAPHQL: { color: Color.Orange, bodyAllowed: true },
} as const;

export const SORT_OPTIONS = {
  MANUAL: "manual",
  NAME_ASC: "name-asc",
  NAME_DESC: "name-desc",
  METHOD: "method",
  URL: "url",
} as const;

export type SortOption = (typeof SORT_OPTIONS)[keyof typeof SORT_OPTIONS];
