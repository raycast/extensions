import type { Account, Activity, Balance, Position, UniversalSymbol } from "../lib/types";

/** Fixture dates are relative to "now" so Fog and streaks stay meaningful in screenshots. */
export const FIXTURE_NOW = new Date();

/**
 * Exactly N×24h before FIXTURE_NOW (plus a minute of slack), so "N days ago" floors to N regardless
 * of the time of day or timezone the code runs in. `hour` is accepted for call-site readability only.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function daysAgo(days: number, hour = 14): string {
  return new Date(FIXTURE_NOW.getTime() - days * 86_400_000 - 60_000).toISOString();
}

export function isoDateDaysAgo(days: number): string {
  return daysAgo(days).slice(0, 10);
}

export function sym(
  symbol: string,
  description: string,
  currency: string,
  exchange: string,
  type: { code: string; description: string } = { code: "cs", description: "Common Stock" },
): UniversalSymbol {
  const raw = symbol.replace(/\.[A-Z]+$/, "");
  return {
    id: `sym-${symbol.toLowerCase().replace(".", "-")}`,
    symbol,
    raw_symbol: raw,
    description,
    currency: {
      id: `cur-${currency.toLowerCase()}`,
      code: currency,
      name: currency === "CAD" ? "Canadian dollar" : "US dollar",
    },
    exchange: { id: `ex-${exchange.toLowerCase()}`, code: exchange, name: exchange },
    type: { id: `type-${type.code}`, ...type },
  };
}

export const ETF = { code: "et", description: "ETF" };

export function position(symbol: UniversalSymbol, units: number, price: number, averageCost: number): Position {
  const code = symbol.currency?.code ?? "USD";
  return {
    symbol: { id: symbol.id, description: symbol.description ?? "", symbol },
    units,
    price,
    open_pnl: Math.round((price - averageCost) * units * 100) / 100,
    average_purchase_price: averageCost,
    currency: { id: `cur-${code.toLowerCase()}`, code },
    cash_equivalent: false,
  };
}

export function balance(currency: string, cash: number, buyingPower?: number): Balance {
  return { currency: { id: `cur-${currency.toLowerCase()}`, code: currency }, cash, buying_power: buyingPower ?? cash };
}

export function account(input: {
  id: string;
  authorization: string;
  name: string;
  number: string;
  institution: string;
  total: number;
  currency: string;
  rawType: string;
  createdDaysAgo?: number;
}): Account {
  return {
    id: input.id,
    brokerage_authorization: input.authorization,
    name: input.name,
    number: input.number,
    institution_name: input.institution,
    created_date: daysAgo(input.createdDaysAgo ?? 400),
    sync_status: {
      holdings: { initial_sync_completed: true, last_successful_sync: daysAgo(0, 9), holdings_unavailable: false },
      transactions: {
        initial_sync_completed: true,
        last_successful_sync: daysAgo(0, 9),
        first_transaction_date: isoDateDaysAgo(700),
      },
    },
    balance: { total: { amount: input.total, currency: input.currency } },
    status: "open",
    raw_type: input.rawType,
    account_category: "INVESTMENT",
    is_paper: false,
  };
}

export interface ActivityInput {
  id: string;
  type: string;
  daysAgo: number;
  amount: number;
  currency: string;
  symbol?: UniversalSymbol;
  units?: number;
  price?: number;
  fee?: number;
  description?: string;
  institution: string;
  account: Account;
}

export function activity(input: ActivityInput): Activity {
  return {
    id: input.id,
    symbol: input.symbol
      ? {
          id: input.symbol.id,
          symbol: input.symbol.symbol,
          raw_symbol: input.symbol.raw_symbol,
          description: input.symbol.description,
        }
      : null,
    option_symbol: null,
    price: input.price ?? 0,
    units: input.units ?? 0,
    amount: input.amount,
    currency: { id: `cur-${input.currency.toLowerCase()}`, code: input.currency },
    type: input.type,
    description: input.description ?? defaultDescription(input),
    trade_date: daysAgo(input.daysAgo),
    settlement_date: daysAgo(Math.max(0, input.daysAgo - 2)),
    fee: input.fee ?? 0,
    institution: input.institution,
    account: { id: input.account.id, name: input.account.name, number: input.account.number },
  };
}

function defaultDescription(input: ActivityInput): string {
  const s = input.symbol?.symbol ?? "";
  switch (input.type) {
    case "BUY":
      return `Bought ${input.units} ${s} @ ${input.price}`;
    case "SELL":
      return `Sold ${input.units} ${s} @ ${input.price}`;
    case "DIVIDEND":
      return `Dividend ${s}`;
    case "CONTRIBUTION":
      return "Electronic funds transfer in";
    case "WITHDRAWAL":
      return "Electronic funds transfer out";
    case "INTEREST":
      return "Interest on cash balance";
    case "FEE":
      return "Account fee";
    default:
      return input.type;
  }
}
