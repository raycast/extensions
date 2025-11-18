// MoneyTree API Constants
export const CLIENT_ID = "2f5c4a5f8b5db8a2a85109645ca8fafcfddd7975ef12d615c99d94ea7efce7df";
export const REDIRECT_URI = "https://app.getmoneytree.com/callback";
export const OAUTH_BASE_URL = "https://myaccount.getmoneytree.com";
export const API_BASE_URL = "https://jp-api.getmoneytree.com/v8/api";
export const SDK_PLATFORM = "js";
export const SDK_VERSION = "3.1.1";
export const API_VERSION = "6";

// Storage Keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: "moneytree_access_token",
  REFRESH_TOKEN: "moneytree_refresh_token",
  EXPIRES_AT: "moneytree_expires_at",
  CODE_VERIFIER: "moneytree_code_verifier",
} as const;

// Cache TTL (in milliseconds)
export const CACHE_TTL = {
  CREDENTIALS: 5 * 60 * 1000, // 5 minutes
  ACCOUNTS: 5 * 60 * 1000, // 5 minutes
  TRANSACTIONS: 2 * 60 * 1000, // 2 minutes
} as const;
