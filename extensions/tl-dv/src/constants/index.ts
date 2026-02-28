export const API_CONSTANTS = {
  DEFAULT_API_URL: "https://pasta.tldv.io/v1alpha1",
  DEFAULT_PAGE_SIZE: 20,
  REQUEST_TIMEOUT: 10000,
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
} as const;

export const UI_CONSTANTS = {
  DEBOUNCE_DELAY: 300,
  MAX_TITLE_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 200,
} as const;

export const ERROR_MESSAGES = {
  API_KEY_REQUIRED: "API Key Required",
  API_KEY_MISSING: "Please set your tl;dv API key in the extension preferences",
  NETWORK_ERROR: "Network error occurred. Please check your connection.",
  INVALID_RESPONSE: "Invalid response from server",
  TIMEOUT: "Request timed out. Please try again.",
} as const;
