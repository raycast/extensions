export enum AccountType {
  asset = "asset",
  expense = "expense",
  import = "import",
  revenue = "revenue",
  cash = "cash",
  liability = "liability",
  liabilities = "liabilities",
  "initial-balance" = "initial-balance",
  reconciliation = "reconciliation",
}
export enum AccountRole {
  defaultAsset = "defaultAsset",
  sharedAsset = "sharedAsset",
  savingAsset = "savingAsset",
  ccAsset = "ccAsset",
  cashWalletAsset = "cashWalletAsset",
}
export type Account = {
  type: "accounts";
  id: string;
  attributes: {
    active: string;
    name: string;
    type: AccountType;
    account_role: AccountRole | null;
    currency_symbol: string;
    current_balance: string;
    account_number: string | null;
    iban: string | null;
  };
};
export type AccountStore = {
  name: string;
  type: AccountType;
  notes: string;
};

export enum TransactionType {
  withdrawal = "withdrawal",
  deposit = "deposit",
  transfer = "transfer",
  reconciliation = "reconciliation",
  "opening balance" = "opening balance",
}
type TransactionSplit = {
  type: TransactionType;
  currency_symbol: string;
  currency_decimal_places: number;
  amount: string;
  description: string;
};
export type Transaction = {
  type: "transactions";
  id: string;
  attributes: {
    transactions: [TransactionSplit];
  };
};
export type TransactionSplitStore = {
  type: TransactionType;
  date: string;
  amount: string;
  description: string;
  source_id: string;
  destination_id: string;
};
export type TransactionStore = {
  transactions: TransactionSplitStore[];
};
export type PaginatedResult<T> = {
  data: T[];
  meta: {
    pagination: {
      total: number;
      count: number;
      per_page: number;
      current_page: number;
      total_pages: number;
    };
  };
};
