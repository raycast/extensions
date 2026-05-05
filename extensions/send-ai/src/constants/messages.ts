// Success messages
export const SUCCESS_MESSAGES = {
  TOKEN_PURCHASE: "Token purchase executed successfully",
  TOKEN_SALE: "Token sale executed successfully",
  DCA_CREATED: "DCA strategy created successfully",
  LIMIT_ORDER_CREATED: "Limit order created successfully",
  PORTFOLIO_LOADED: "Portfolio data loaded successfully",
  TOKEN_DATA_RETRIEVED: "Token data retrieved successfully",
} as const;

// Error messages
export const ERROR_MESSAGES = {
  INVALID_AMOUNT: "Please enter a valid amount greater than 0",
  INVALID_TOKEN_ADDRESS: "Please enter a valid token address",
  INVALID_TOKEN_MINT: "Please enter a valid token mint address",
  FAILED_TOKEN_PURCHASE: "Failed to execute token purchase",
  FAILED_TOKEN_SALE: "Failed to execute token sale",
  FAILED_DCA_CREATION: "Failed to create DCA strategy",
  FAILED_PORTFOLIO_LOAD: "Failed to load portfolio",
  FAILED_TOKEN_DATA: "Failed to load token data",
  AUTH_TOKEN_MISSING: "Authentication token not found. Please sign in again.",
  GENERIC_ERROR: "An unexpected error occurred",
} as const;

// Form placeholders
export const PLACEHOLDERS = {
  TOKEN_ADDRESS: "Enter token CA",
  AMOUNT_SOL: "Enter amount in SOL",
  AMOUNT_TO_SPEND: "Enter amount to spend",
  AMOUNT_TO_SELL: "Enter amount to sell",
  AMOUNT_TO_ALLOCATE: "Enter amount to allocate",
  NUMBER_OF_ORDERS: "Enter total number of orders",
  INTERVAL_MINUTES: "Enter interval between orders in minutes",
  SELECT_TOKEN: "Select token from portfolio",
} as const;

// Form labels
export const LABELS = {
  TOKEN_ADDRESS: "Token Address",
  AMOUNT_SOL: "Amount (in SOL)",
  AMOUNT: "Amount",
  SELLING: "Selling",
  BUYING: "Buying",
  ALLOCATE: "Allocate",
  OVER: "Over",
  EVERY: "Every",
  TOKEN: "Token",
} as const;

// Button labels
export const BUTTONS = {
  BUY: "Buy",
  SELL: "Sell",
  CREATE_DCA: "Create DCA",
  CREATE_LIMIT_ORDER: "Create Limit Order",
  REFRESH: "Refresh",
  VIEW_DETAILS: "View Details",
  VIEW_ON_SOLSCAN: "View on Solscan",
} as const;
