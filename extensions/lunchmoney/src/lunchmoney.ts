import ky from "ky";
import { getPreferences } from "./preferences";
import fetch from "isomorphic-fetch";

const base = "https://dev.lunchmoney.app";

// Took base types from https://github.com/lunch-money/lunch-money-js/blob/master/index.ts
export type AssetTypeName =
  | "employee compensation"
  | "cash"
  | "vehicle"
  | "loan"
  | "cryptocurrency"
  | "investment"
  | "other"
  | "credit"
  | "real estate";
export type Asset = {
  id: number;
  type_name: AssetTypeName;
  subtype_name?: string | null;
  name: string;
  display_name?: string | null;
  balance: string;
  balance_as_of: string;
  currency: string;
  closed_on?: string | null;
  institution_name?: string | null;
  created_at: string;
};

export interface AssetUpdate {
  id: number;
  type_name?: AssetTypeName;
  subtype_name?: string | null;
  name?: string;
  display_name?: string | null;
  balance?: string;
  balance_as_of?: string;
  currency?: string;
  institution_name?: string | null;
}

export type PlaidAccountType = "credit" | "depository" | "brokerage" | "cash" | "loan" | "investment";
export type PlaidAccountStatus = "active" | "inactive" | "relink" | "syncing" | "error" | "not found" | "not supported";
export interface PlaidAccount {
  id: number;
  date_linked: string;
  name: string;
  type: PlaidAccountType;
  subtype?: string | null;
  mask: string;
  institution_name: string;
  status: PlaidAccountStatus;
  last_import?: string | null;
  balance: string;
  currency: string;
  balance_last_update: string;
  limit?: number | null;
}

export enum TransactionStatus {
  CLEARED = "cleared",
  UNCLEARED = "uncleared",
  PENDING = "pending",
}

export enum ReccuringTransactionType {
  CLEARED = "cleared",
  SUGGESTED = "suggested",
  DISMISSED = "dismissed",
}

export interface Transaction {
  id: number;
  created_at: string;
  updated_at: string;
  date: string;
  payee: string;
  amount: string;
  currency: string;
  to_base: number;
  notes: string;
  category_id?: number;
  category_name: string | null;
  asset_id?: number;
  asset_name: string | null;
  plaid_account_id?: number;
  plaid_account_name: string | null;
  status: TransactionStatus | null;
  parent_id?: number;
  is_group: boolean | null;
  group_id?: number;
  tags?: Tag[];
  external_id?: string;
  is_pending: boolean;
  is_income: boolean;
  display_name?: string;
  display_note: string | null;
  account_display_name: string;

  // recurring
  recurring_id: number | null;
  recurring_payee: string | null;
  recurring_type: ReccuringTransactionType | null;
  recurring_description: string | null;
  recurring_cadence: string | null;
  recurring_amount: number | null;
  recurring_currency: string | null;
}

export interface TransactionUpdate {
  date?: string;
  category_id?: number;
  payee?: string;
  amount?: number | string;
  currency?: string;
  asset_id?: number;
  recurring_id?: number;
  notes?: string;
  status?: TransactionStatus.CLEARED | TransactionStatus.UNCLEARED;
  external_id?: string;
  tags?: (number | string)[];
}

export interface Split {
  payee?: string;
  date?: string;
  category_id?: number;
  notes?: string;
  amount: string | number;
}
export interface TransactionUpdateResponse {
  updated: boolean;
  split?: Split;
}

export interface Category {
  id: number;
  name: string;
  description: string;
  is_income: boolean;
  exclude_from_budget: boolean;
  exclude_from_totals: boolean;
  updated_at: string;
  created_at: string;
  is_group: boolean;
  group_id?: number;
  children?: Category[];
}

export interface SummarizedTransaction {
  id: number;
  date: string;
  amount: string;
  currency: string;
  payee: string;
  category_id?: number;
  recurring_id?: number;
  to_base: number;
}

export interface RecurringItem {
  id: number;
  start_date?: string;
  end_date?: string;
  payee: string;
  currency: string;
  created_at: string;
  updated_at: string;
  billing_date: string;
  original_name?: string;
  description?: string;
  plaid_account_id?: number;
  asset_id?: number;
  source: "manual" | "transaction" | "system" | "null";
  notes?: string;
  amount: string;
  category_id?: number;
  category_group_id?: number;
  is_income: boolean;
  exclude_from_totals: boolean;
  granularity: "day" | "week" | "month" | "year";
  quantity?: number;
  occurrences: Record<string, SummarizedTransaction[]>;
  transactions_within_range?: SummarizedTransaction[];
  missing_dates_within_range?: string[];
  date?: string;
  to_base: number;
}

export interface DraftTransaction {
  date: string;
  category_id?: number;
  payee: string;
  amount: string;
  currency: string;
  notes: string;
  asset_id?: number;
  recurring_id?: number;
  status: TransactionStatus.CLEARED | TransactionStatus.UNCLEARED;
  external_id?: string;
}

export interface Tag {
  id: number;
  name: string;
  description?: string;
  archived: boolean;
}

export type TransactionsEndpointArguments = {
  start_date?: string;
  end_date?: string;
  tag_id?: number;
  debit_as_negative?: boolean;
};

const { token } = getPreferences();

const client = ky.create({
  prefixUrl: base,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  fetch,
});

export const getTransactions = async (args?: TransactionsEndpointArguments): Promise<Transaction[]> => {
  const response = await client.get<{ transactions: Transaction[] }>("v1/transactions", { searchParams: args });
  return (await response.json()).transactions;
};

export const getTransaction = async (transactionId: number): Promise<Transaction> => {
  const response = await client.get<Transaction>(`v1/transactions/${transactionId}`);
  return response.json();
};

export type UpdateTransactionResponse = {
  updated: boolean;
  split?: number[];
};

export const updateTransaction = async (
  transactionId: number,
  args: TransactionUpdate,
): Promise<UpdateTransactionResponse> => {
  const response = await client.put<UpdateTransactionResponse>(`v1/transactions/${transactionId}`, {
    json: { transaction: args },
  });
  return response.json();
};

export const getCategories = async (): Promise<Category[]> => {
  const response = await client.get<{ categories: Category[] }>("v1/categories", {
    searchParams: { format: "nested" },
  });
  return (await response.json()).categories;
};

export const getTags = async (): Promise<Tag[]> => {
  const response = await client.get<Tag[]>("v1/tags");
  return response.json();
};

export const getRecurringItems = async (): Promise<RecurringItem[]> => {
  const response = await client.get<RecurringItem[]>(`v1/recurring_items`);
  return response.json();
};
