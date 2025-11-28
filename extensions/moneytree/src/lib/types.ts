// Authentication Types
export interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
  created_at: number;
  resource_server: string;
}

export interface TokenInfo {
  iss: string;
  iat: number;
  exp: number;
  aud: string[];
  sub: string;
  scope: string;
  client_id: string;
  app: {
    name: string;
    is_mt: boolean;
  };
  guest: {
    email: string;
    country: string;
    currency: string;
    lang: string;
  };
}

export interface StoredTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  code_verifier?: string;
}

// Credential Types
export interface CredentialErrorInfo {
  reason: string;
  localized_reason: string;
  localized_description: string;
  url: string | null;
  actionable: boolean;
  input_fields: unknown[];
}

export interface Credential {
  id: number;
  institution_name: string | null;
  institution_id: number | null;
  auth_type: number | null;
  status: string;
  error_info: CredentialErrorInfo | null;
  force_refreshable: boolean;
  foreground_refreshable: boolean;
  auto_run: boolean;
  uses_certificate: boolean;
  background_refresh_frequency: number;
  last_success: string | null;
  status_set_at: string;
  created_at: string;
  updated_at: string;
  guest_id: number;
  institution_schema_key: string | null;
}

// Account Types
export interface Account {
  id: number;
  account_type: string;
  currency: string;
  institution_account_number: string | null;
  institution_account_name: string;
  branch_name: string | null;
  nickname: string;
  status: string;
  credential_id: number;
  sub_type: string;
  detail_type: string;
  group: string | null;
  current_balance: number;
  current_balance_in_base: number;
}

export interface CredentialWithAccounts extends Credential {
  accounts: Account[];
}

export interface DataSnapshot {
  guest: {
    id: number;
    locale_identifier: string;
    email: string;
    base_currency: string;
    subscription_level: string;
    country: string;
    credentials: CredentialWithAccounts[];
  };
}

// Transaction Types
export interface Transaction {
  id: number;
  amount: number;
  date: string;
  description_guest: string | null;
  description_pretty: string;
  description_raw: string;
  raw_transaction_id: number;
  created_at: string;
  updated_at: string;
  expense_type: number;
  predicted_expense_type: number;
  category_id: number;
  account_id: number;
  claim_id: number | null;
  attachments: unknown[];
  receipts: unknown[];
  attributes: Record<string, unknown>;
}

export interface TransactionsDetails {
  page: number;
  per_page: number;
  start_date: string;
  end_date: string;
  account_id?: number;
  account_amount_in?: number;
  account_amount_out?: number;
  show_transactions_details: boolean;
  transactions_count: number;
  transactions_total: number;
}

export interface TransactionsResponse {
  transactions: Transaction[];
  transactions_details: TransactionsDetails;
}
