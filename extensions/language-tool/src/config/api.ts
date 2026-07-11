/**
 * LanguageTool API configuration
 */

export const API_BASE_URL = "https://api.languagetool.org/v2";

export const API_ENDPOINTS = {
  LANGUAGES: `${API_BASE_URL}/languages`,
  CHECK: `${API_BASE_URL}/check`,
} as const;

/**
 * API limits (Free vs Premium)
 */
export const API_LIMITS = {
  FREE: {
    REQUESTS_PER_MINUTE: 20,
    CHARACTERS_PER_MINUTE: 75_000,
    CHARACTERS_PER_REQUEST: 20_000,
  },
  PREMIUM: {
    REQUESTS_PER_MINUTE: 80,
    CHARACTERS_PER_MINUTE: 300_000,
    CHARACTERS_PER_REQUEST: 60_000,
  },
} as const;

/**
 * Default timeout for requests (in ms)
 */
export const API_TIMEOUT = 30_000;
