export type Amount = string | number;
export interface Health {
  status?: string | null;
  integrator_message?: string | null;
  transient_message?: string | null;
  failure_count?: number;
  last_attempt_at?: string | null;
}
export interface Institution {
  id: number;
  name?: string | null;
  logo?: string | null;
  category?: string | null;
}
export interface FinancialConnection {
  id: number;
  institution?: Institution | null;
  enabled: boolean;
  status?: string | null;
  status_message?: string | null;
  health?: Health | null;
  consent_expires_at?: string | null;
  accounts_last_synced_at?: string | null;
  financial_accounts_count?: number | string;
  financial_accounts?: FinancialAccount[];
}
export interface FinancialAccount {
  id: number;
  financial_connection_id?: number;
  financial_connection?: FinancialConnection | null;
  name?: string | null;
  custom_name?: string | null;
  display_name?: string | null;
  product_name?: string | null;
  currency?: string | null;
  enabled: boolean;
  account_category?: string | null;
  source_type?: string | null;
  integrator?: string | null;
  balance?: { available?: Amount | null; cleared?: Amount | null } | null;
  total_balance?: { amount?: Amount | null; currency?: string | null } | null;
  health?: Health | null;
  balances_last_synced_at?: string | null;
  transactions_last_synced_at?: string | null;
  /** Local presentation note; not part of Synci's wire response. */
  balance_warning?: string;
}
export interface BalanceEntry {
  id: number;
  amount: Amount | null;
  currency: string;
  type: string;
  reference_date?: string | null;
  integrator_last_changed_at?: string | null;
  updated_at?: string | null;
  credit_limit_included?: boolean | null;
}
export interface Transaction {
  // Keep every returned field available to the advanced detail view.
  [key: string]: unknown;
  id: number;
  financial_account_id: number;
  financial_account?: FinancialAccount | null;
  amount: Amount;
  currency: string;
  booked: boolean;
  booking_date?: string | null;
  value_date?: string | null;
  transaction_type?: string | null;
  mapped_fields?: { payee?: string | null; description?: string | null; date?: string | null } | null;
  creditor?: { name?: string | null } | null;
  debtor?: { name?: string | null } | null;
  remittance_information?: {
    unstructured?: string | null;
    structured?: string | null;
    unstructured_array?: string[];
  } | null;
  additional_information?: string | null;
  enriched?: {
    counterparty?: { name?: string | null; logo_url?: string | null } | null;
    intermediary?: { name?: string | null; logo_url?: string | null } | null;
    [key: string]: unknown;
  } | null;
}
export interface AccountHolding {
  id: number;
  financial_account_id: number;
  symbol?: string | null;
  description?: string | null;
  asset_class?: string | null;
  quantity: Amount | null;
  average_purchase_price?: Amount | null;
  last_price?: Amount | null;
  market_value?: Amount | null;
  currency?: string | null;
  integrator?: string | null;
  synced_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}
export interface AccountHoldings {
  account: FinancialAccount;
  holdings: AccountHolding[];
}
export interface Page<T> {
  data: T[];
  links: { next?: string | null };
  meta: { current_page: number; last_page: number; total: number };
}
export type Period = "7" | "30" | "month" | "all";
