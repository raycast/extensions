import { post, QuickFileResponse } from ".";

export type BankType = "CURRENT" | "PETTY" | "BUILDINGSOC" | "LOAN" | "MERCHANT" | "EQUITY" | "CREDITCARD" | "RESERVE";
export const allBankTypes = ["CURRENT", "PETTY", "BUILDINGSOC", "LOAN", "MERCHANT", "EQUITY", "CREDITCARD", "RESERVE"];

export interface BankGetAccounts {
  BankAccounts: Array<{
    BankId: number;
    Name: string;
    NominalCode: number;
    BankType: BankType;
    IsDefaultAccount: boolean;
    LogoPath: string | null;
    IsHidden: boolean;
    OpenBankingConsents?: Array<{ BankName: string; ExpiryDate: string }>;
  }>;
}

export const bankGetAccounts = async (): Promise<BankGetAccounts["BankAccounts"]> => {
  const { Bank_GetAccounts } = await post<{ Bank_GetAccounts: QuickFileResponse<BankGetAccounts> }>(
    "bank/getaccounts",
    {
      SearchParameters: {
        OrderResultsBy: "Position",
        AccountTypes: { AccountType: allBankTypes },
        ShowHidden: false,
        GetOpenBankingConsents: true,
      },
    }
  );
  return Bank_GetAccounts.Body.BankAccounts;
};

export interface BankGetAccountBalances {
  AccountBalances: Array<{ NominalCode: number; Amount: number }>;
}

export const bankGetAccountBalances = async (codes: number[]) => {
  const { Bank_GetAccountBalances } = await post<{
    Bank_GetAccountBalances: QuickFileResponse<BankGetAccountBalances>;
  }>("bank/getaccountbalances", {
    NominalCodes: { NominalCode: codes },
  });
  return Bank_GetAccountBalances.Body.AccountBalances;
};

export interface BankGetAccountTransactions {
  MetaData: {
    RecordsetCount: number;
    ReturnCount: number;
    BankName: string;
    BankType: BankType;
    AccountNo: string;
    SortCode: string;
    Currency: string;
    CurrentBalance: number;
  };
  Transactions: {
    Transaction: Array<{
      TransactionDate: string;
      Reference: string;
      Notes?: string;
      Amount: number;
      Balance?: number;
      TagStatus: "untagged" | "tagged";
      TransactionId: number;
    }>;
  };
}

export const bankGetAccountTransactions = async (code: number, options: { number?: number; offset?: number } = {}) => {
  const { Bank_Search } = await post<{ Bank_Search: QuickFileResponse<BankGetAccountTransactions> }>("bank/search", {
    SearchParameters: {
      ReturnCount: options?.number ?? 1,
      Offset: options?.offset || 0,
      OrderResultsBy: "TransactionDate",
      OrderDirection: "DESC",
      NominalCode: code,
    },
  });
  return { ...Bank_Search.Body, NominalCode: code };
};
