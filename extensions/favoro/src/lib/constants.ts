// FAVORO URLs
export const FAVORO_WEB_URL = "https://favoro.app";

// FAVORO API Configuration
export const API_BASE_URL = "https://favoro.app/api";
export const OAUTH_AUTHORIZE_URL = "https://favoro.app/oauth/authorize";
export const OAUTH_TOKEN_URL = "https://favoro.app/oauth/token";

// Extension Info
export const EXTENSION_NAME = "app.favoro.raycast";
export const EXTENSION_VERSION = "1.0.0";
export const USER_AGENT = `${EXTENSION_NAME}/${EXTENSION_VERSION}`;

// OAuth Configuration
export const OAUTH_SCOPE = "read";
export const OAUTH_CLIENT_ID = "019b2cc1-bbb2-73cc-9c51-412d79aaf999";

// API Endpoints (used by search and browse features)
export const ENDPOINTS = {
  SEARCH: "/v1/links/search",
  BOOKMARKS: "/v1/bookmarks",
  AREAS: "/v1/areas",
  SECTIONS: "/v1/sections",
  USER: "/v1/user",
} as const;

// Cache Configuration
export const CACHE_KEYS = {
  DATA: "favoro-cache-data",
  METADATA: "favoro-cache-meta",
  FAVORITES: "favoro-favorites",
} as const;

// Favorites Configuration
export const MAX_FAVORITES = 50;

// Cache staleness threshold in milliseconds (15 minutes)
export const CACHE_STALE_THRESHOLD_MS = 15 * 60 * 1000;
