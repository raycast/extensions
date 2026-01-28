// Shared types for the Rewiser extension

export interface Folder {
  key: string;
  id?: string;
  label: string;
  currency: string;
  is_personal?: boolean;
}

export interface Transaction {
  id: string;
  name: string;
  amount: number;
  type: "Expense" | "Income";
  planned_date: string;
  created_at: string;
  is_paid: boolean;
  note?: string;
}

export interface ChatMessage {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface TransactionRequest {
  transcript: string;
  folder_id: string;
  context: {
    source: string;
  };
}

export interface TransactionListRequest {
  folder_id: string;
  month: number;
  year: number;
  type: "Expense" | "Income";
  limit: number;
}

export interface TransactionUpdateRequest {
  transaction_id: string;
  action: "toggle" | "delete";
}

export interface ProcessedTransaction {
  type: "Expense" | "Income";
  name: string;
  amount: number;
  currency?: string;
}

export interface ShareLink {
  share_code: string;
  share_url: string;
  expires_at: string;
  created_at: string;
  is_mine?: boolean;
}

export interface ShareRequest {
  folder_id: string;
  action: "create" | "list" | "delete";
  share_code?: string;
}

export type ViewState = "folders" | "add" | "transactions" | "share";

export interface ErrorState {
  hasError: boolean;
  message: string;
  code?: string;
}

// Note: API endpoints are now managed in config.ts
// Import API_ENDPOINTS from './config' to use them

// Common error messages
export const ERROR_MESSAGES = {
  NO_TOKEN: "Please log in to continue",
  INVALID_TOKEN: "Invalid authentication token",
  NETWORK_ERROR: "Network connection failed",
  FOLDER_LOAD_ERROR: "Failed to load folders",
  TRANSACTION_LOAD_ERROR: "Failed to load transactions",
  TRANSACTION_ADD_ERROR: "Failed to add transaction",
  TRANSACTION_UPDATE_ERROR: "Failed to update transaction",
  EMPTY_INPUT: "Please enter a transaction description",
  UNKNOWN_ERROR: "An unexpected error occurred",
};

// Success messages
export const SUCCESS_MESSAGES = {
  TRANSACTION_ADDED: "Transaction added successfully",
  TRANSACTION_UPDATED: "Transaction updated successfully",
  TRANSACTION_DELETED: "Transaction deleted successfully",
  STATUS_PAID: "Marked as Paid",
  STATUS_PLANNED: "Marked as Planned",
  AUTH_SUCCESS: "Connected successfully",
  LOGOUT_SUCCESS: "Signed out successfully",
};
