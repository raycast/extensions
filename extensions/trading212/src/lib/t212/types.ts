export type Environment = "live" | "demo";

export interface T212Instrument {
  ticker: string;
  name: string;
  isin: string;
  currency: string;
}

export interface AccountSummary {
  id: number;
  currency: string;
  totalValue: number;
  cash: { availableToTrade: number; reservedForOrders: number; inPies: number };
  investments: { currentValue: number; totalCost: number; unrealizedProfitLoss: number; realizedProfitLoss: number };
}

export interface Position {
  instrument: T212Instrument;
  quantity: number;
  averagePricePaid: number;
  currentPrice: number;
  createdAt: string;
  walletImpact: {
    currency: string;
    currentValue: number;
    totalCost: number;
    unrealizedProfitLoss: number;
    /** Null (per spec) when the instrument currency matches the account currency. */
    fxImpact: number | null;
  };
}

export interface DividendItem {
  reference: string;
  ticker: string;
  instrument: T212Instrument;
  amount: number;
  currency: string;
  /** Documented by Trading 212 but absent in real responses. */
  tickerCurrency?: string;
  grossAmountPerShare: number;
  quantity: number;
  paidOn: string;
  type: string;
}

export interface Tax {
  name: string;
  quantity: number;
  currency: string;
  chargedAt?: string;
}

export interface HistoricalOrder {
  order: {
    id: number;
    ticker: string;
    instrument: T212Instrument;
    side: "BUY" | "SELL";
    status: string;
    type: string;
    strategy?: "QUANTITY" | "VALUE";
    quantity?: number;
    value?: number;
    filledQuantity?: number;
    filledValue?: number;
    currency: string;
    createdAt: string;
  };
  fill?: {
    id: number;
    filledAt: string;
    price: number;
    quantity: number;
    type: string;
    walletImpact: {
      currency: string;
      netValue: number;
      fxRate: number;
      realisedProfitLoss: number;
      taxes: Tax[];
    };
  };
}

export type TransactionType =
  "WITHDRAW" | "DEPOSIT" | "FEE" | "TRANSFER" | "INTEREST_ON_FREE_CASH" | "LENDING_INTEREST";

export interface TransactionItem {
  reference: string;
  type: TransactionType;
  amount: number;
  currency: string;
  dateTime: string;
}

export interface Page<T> {
  items: T[];
  nextPagePath: string | null;
}
