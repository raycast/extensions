// Environment configuration for the Rewiser extension

// Base configuration
export const CONFIG = {
  // API Configuration
  API_BASE_URL: "https://nzkqapsaeatytqrnitpj.supabase.co/functions/v1",
  API_TIMEOUT: 30000, // 30 seconds
  MAX_RETRIES: 3,

  // Request limits
  DEFAULT_TRANSACTION_LIMIT: 100,
  MAX_SEARCH_RESULTS: 50,

  // UI Configuration
  TOAST_DURATION: 3000,
  DEBOUNCE_DELAY: 300,
} as const;

// API endpoint paths
export const API_PATHS = {
  VERIFY_AUTH: "/verify-auth",
  GET_FOLDERS: "/get-folders",
  ADD_TRANSACTION: "/add-transaction-from-raycast",
  GET_TRANSACTIONS: "/get-transactions-raycast",
  UPDATE_TRANSACTION: "/update-transaction-raycast",
  SHARE_FOLDER: "/share-link-from-raycast",
} as const;

// Construct full API URLs
export const API_ENDPOINTS = {
  VERIFY_AUTH: `${CONFIG.API_BASE_URL}${API_PATHS.VERIFY_AUTH}`,
  GET_FOLDERS: `${CONFIG.API_BASE_URL}${API_PATHS.GET_FOLDERS}`,
  ADD_TRANSACTION: `${CONFIG.API_BASE_URL}${API_PATHS.ADD_TRANSACTION}`,
  GET_TRANSACTIONS: `${CONFIG.API_BASE_URL}${API_PATHS.GET_TRANSACTIONS}`,
  UPDATE_TRANSACTION: `${CONFIG.API_BASE_URL}${API_PATHS.UPDATE_TRANSACTION}`,
  SHARE_FOLDER: `${CONFIG.API_BASE_URL}${API_PATHS.SHARE_FOLDER}`,
} as const;

// Validation constants
export const VALIDATION = {
  MIN_TOKEN_LENGTH: 10,
  MAX_DESCRIPTION_LENGTH: 500,
  MIN_AMOUNT: 0.01,
  MAX_AMOUNT: 999999999,
} as const;

// Default values
export const DEFAULTS = {
  CURRENCY: "EUR",
  TRANSACTION_TYPE: "Expense",
  PAYMENT_STATUS: false,
} as const;
