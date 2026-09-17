/**
 * Minimal, hand-written subset of the SnapTrade API models that Folio reads.
 * Field names mirror the API (snake_case) so fixtures and live responses share one shape.
 * Everything here is read-only data; Folio never writes to SnapTrade.
 */

export interface CurrencyRef {
  id?: string;
  code?: string;
  name?: string;
}

export interface AccountBalanceTotal {
  amount?: number;
  currency?: string;
}

export interface HoldingsStatus {
  initial_sync_completed?: boolean;
  last_successful_sync?: string | null;
  holdings_unavailable?: boolean;
}

export interface TransactionsStatus {
  initial_sync_completed?: boolean;
  last_successful_sync?: string | null;
  first_transaction_date?: string | null;
}

export interface Account {
  id: string;
  brokerage_authorization: string;
  name: string | null;
  number: string;
  institution_name: string;
  created_date?: string;
  sync_status?: { holdings?: HoldingsStatus; transactions?: TransactionsStatus };
  balance: { total?: AccountBalanceTotal | null };
  status?: "open" | "closed" | "archived" | "unavailable";
  raw_type?: string | null;
  account_category?: "INVESTMENT" | "DEPOSIT" | "LOC" | null;
  is_paper?: boolean;
}

export interface Balance {
  currency?: CurrencyRef;
  cash?: number | null;
  buying_power?: number | null;
}

export interface UniversalSymbol {
  id?: string;
  symbol: string;
  raw_symbol?: string;
  description?: string | null;
  currency?: CurrencyRef;
  exchange?: { id?: string; code?: string; name?: string };
  type?: { id?: string; code?: string; description?: string };
}

export interface Position {
  symbol?: { id?: string; description?: string; symbol?: UniversalSymbol };
  units?: number | null;
  price?: number | null;
  open_pnl?: number | null;
  average_purchase_price?: number | null;
  currency?: CurrencyRef;
  cash_equivalent?: boolean | null;
}

export interface OptionsPosition {
  symbol?: {
    id?: string;
    description?: string;
    option_symbol?: {
      id?: string;
      ticker: string;
      option_type: "CALL" | "PUT";
      strike_price: number;
      expiration_date: string;
      underlying_symbol?: UniversalSymbol;
    };
  };
  price?: number | null;
  units?: number;
  /** Cost basis per contract. */
  average_purchase_price?: number | null;
  currency?: CurrencyRef | null;
  /** Shares per contract; SnapTrade reports it on the new positions endpoint. Defaults to 100. */
  multiplier?: number;
}

/** Instrument as returned by GET /accounts/{id}/positions/all (the replacement for the deprecated /holdings). */
export interface Instrument {
  kind: string;
  id: string;
  symbol: string;
  raw_symbol?: string;
  description?: string | null;
  currency?: string | null;
  exchange?: string | null;
  // option-only
  option_type?: "CALL" | "PUT";
  strike_price?: string;
  expiration_date?: string;
  multiplier?: string;
  underlying?: {
    symbol?: string;
    raw_symbol?: string;
    description?: string | null;
    currency?: string | null;
    exchange?: string | null;
  };
}

export interface AccountPosition {
  instrument: Instrument;
  units?: string | null;
  price?: string | null;
  /** Average purchase price per share (per share for options too). */
  cost_basis?: string | null;
  currency?: string | null;
  cash_equivalent?: boolean;
}

export interface AllAccountPositionsResponse {
  results?: AccountPosition[];
  data_freshness?: { as_of?: string };
}

export interface AccountHoldings {
  account?: Account;
  balances?: Balance[] | null;
  positions?: Position[] | null;
  option_positions?: OptionsPosition[] | null;
}

/** SnapTrade "universal activity" (a transaction). */
export interface Activity {
  id?: string;
  symbol?: { id?: string; symbol?: string; raw_symbol?: string; description?: string | null } | null;
  option_symbol?: { id?: string; ticker?: string; option_type?: string } | null;
  price?: number;
  units?: number;
  amount?: number | null;
  currency?: CurrencyRef | null;
  type?: string;
  option_type?: string;
  description?: string;
  trade_date?: string | null;
  settlement_date?: string;
  fee?: number;
  institution?: string;
  /** Populated by the activities endpoint; Folio also fills it in when it fans out per account. */
  account?: { id?: string; name?: string | null; number?: string } | null;
}

export interface PaginatedActivities {
  data?: Activity[];
  pagination?: { offset?: number; limit?: number; total?: number };
}

export interface BrokerageAuthorization {
  id?: string;
  created_date?: string;
  brokerage?: { id?: string; slug?: string; name?: string; display_name?: string };
  name?: string;
  type?: string;
  disabled?: boolean;
  disabled_date?: string | null;
}

export interface LoginRedirectURI {
  redirectURI?: string;
  sessionId?: string;
}

export interface AccountValueHistoryItem {
  date?: string;
  total_value?: string;
}

export interface AccountValueHistoryResponse {
  history?: AccountValueHistoryItem[];
}

/** Everything the UI needs for one account, fetched in one pass. */
export interface AccountSnapshot {
  account: Account;
  holdings: AccountHoldings;
  /** Present only when the balance-history endpoint returned at least two points. */
  dayChange?: { amount: number; currency: string; asOf: string };
}

export interface PortfolioSnapshot {
  accounts: AccountSnapshot[];
  fetchedAt: string;
}
