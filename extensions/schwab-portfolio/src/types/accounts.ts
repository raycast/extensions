export interface AccountNumberMapping {
  accountNumber: string;
  hashValue: string;
}

export interface SecuritiesAccount {
  type: string;
  accountNumber: string;
  roundTrips: number;
  isDayTrader: boolean;
  isClosingOnlyRestricted: boolean;
  pfcbFlag: boolean;
  positions?: Position[];
  currentBalances?: AccountBalances;
  initialBalances?: AccountBalances;
  projectedBalances?: AccountBalances;
}

export interface Account {
  securitiesAccount: SecuritiesAccount;
  aggregatedBalance?: {
    currentLiquidationValue: number;
    liquidationValue: number;
  };
}

export interface Position {
  shortQuantity: number;
  averagePrice: number;
  currentDayProfitLoss: number;
  currentDayProfitLossPercentage: number;
  longQuantity: number;
  settledLongQuantity: number;
  settledShortQuantity: number;
  instrument: Instrument;
  marketValue: number;
  maintenanceRequirement?: number;
  averageLongPrice?: number;
  taxLotAverageLongPrice?: number;
  longOpenProfitLoss?: number;
  previousSessionLongQuantity?: number;
  currentDayCost?: number;
}

export interface Instrument {
  assetType: AssetType;
  cusip?: string;
  symbol: string;
  description?: string;
  netChange?: number;
  type?: string;
  putCall?: "PUT" | "CALL";
  underlyingSymbol?: string;
  optionMultiplier?: number;
  optionDeliverables?: unknown[];
  expirationDate?: string;
  strikePrice?: number;
}

export type AssetType =
  | "EQUITY"
  | "ETF"
  | "OPTION"
  | "MUTUAL_FUND"
  | "BOND"
  | "INDEX"
  | "CASH_EQUIVALENT"
  | "FIXED_INCOME"
  | "CURRENCY"
  | "COLLECTIVE_INVESTMENT";

export interface AccountBalances {
  accruedInterest?: number;
  cashBalance?: number;
  cashReceipts?: number;
  longOptionMarketValue?: number;
  liquidationValue?: number;
  longMarketValue?: number;
  moneyMarketFund?: number;
  savings?: number;
  shortMarketValue?: number;
  pendingDeposits?: number;
  availableFunds?: number;
  availableFundsNonMarginableTrade?: number;
  buyingPower?: number;
  buyingPowerNonMarginableTrade?: number;
  dayTradingBuyingPower?: number;
  equity?: number;
  equityPercentage?: number;
  longMarginValue?: number;
  maintenanceCall?: number;
  maintenanceRequirement?: number;
  marginBalance?: number;
  regTCall?: number;
  shortBalance?: number;
  shortMarginValue?: number;
  sma?: number;
  totalCash?: number;
  isInCall?: boolean;
  unsettledCash?: number;
  cashAvailableForTrading?: number;
  cashAvailableForWithdrawal?: number;
  cashCall?: number;
  longNonMarginableMarketValue?: number;
  bondValue?: number;
  mutualFundValue?: number;
}

export type AccountType = "all" | "CASH" | "MARGIN";

export interface UserPreferenceResponse {
  accounts?: {
    accountNumber?: string;
    nickName?: string;
    type?: string;
    primaryAccount?: boolean;
  }[];
}

export function getAccountDisplayName(account: Account, names?: Record<string, string>): string {
  const sa = account.securitiesAccount;
  const name = names?.[sa.accountNumber];
  if (name) return name;

  // No nickname or alias: friendly type plus last 4 digits so two same-type
  // accounts stay distinguishable.
  const last4 = sa.accountNumber?.slice(-4) ?? "";
  const type = sa.type === "CASH" ? "Cash Account" : sa.type === "MARGIN" ? "Brokerage Account" : sa.type || "Account";
  return last4 ? `${type} …${last4}` : type;
}

export function getAccountTotalValue(account: Account): number {
  const balances = account.securitiesAccount.currentBalances;
  return balances?.liquidationValue ?? balances?.totalCash ?? 0;
}

export function getCashBalance(account: Account): number {
  const balances = account.securitiesAccount.currentBalances;
  return balances?.cashBalance ?? balances?.totalCash ?? balances?.moneyMarketFund ?? 0;
}
