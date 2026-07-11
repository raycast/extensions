/**
 * Application constants
 * Centralized location for all magic numbers and strings
 */

// Storage keys
export const STORAGE_KEYS = {
  PRESETS: "sadaqah-presets",
} as const;

// Pagination defaults
export const PAGINATION = {
  ITEMS_PER_PAGE: 10,
  COLLECTIONS_PER_PAGE: 5,
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
} as const;

// API Configuration
export const API_CONFIG = {
  TIMEOUT_MS: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 1000,
} as const;

// Validation limits
export const LIMITS = {
  BOX_NAME_MAX: 100,
  BOX_DESCRIPTION_MAX: 500,
  PRESET_NAME_MAX: 50,
  CURRENCY_CODE_MAX: 10,
} as const;

// Error messages (user-friendly)
export const ERROR_MESSAGES = {
  NETWORK_ERROR: "Unable to connect to the server. Please check your internet connection.",
  TIMEOUT_ERROR: "Request timed out. Please try again.",
  UNAUTHORIZED: "Your session has expired. Please reconfigure your API key.",
  NOT_FOUND: "The requested resource was not found.",
  SERVER_ERROR: "An error occurred on the server. Please try again later.",
  UNKNOWN_ERROR: "An unexpected error occurred. Please try again.",
  VALIDATION_ERROR: "Please check your input and try again.",
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  BOX_CREATED: "Box created successfully",
  BOX_UPDATED: "Box updated successfully",
  BOX_DELETED: "Box deleted successfully",
  SADAQAH_ADDED: "Sadaqah added successfully",
  SADAQAH_DELETED: "Sadaqah deleted successfully",
  PRESET_CREATED: "Preset created successfully",
  PRESET_UPDATED: "Preset updated successfully",
  PRESET_DELETED: "Preset deleted successfully",
} as const;

// Security headers for API requests
export const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  Accept: "application/json",
} as const;
