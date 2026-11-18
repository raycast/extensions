import { Color, Icon, Image } from "@raycast/api";
import { humanize } from "./format";
import { MercuryLogin } from "./logins";
import { mercuryGet, TreasuryAccount } from "./mercury";

export interface TreasuryTransaction {
  id: string;
  type: string;
  description: string;
  amount: number;
  /** YYYY-MM-DD */
  canonicalDay: string;
  /** The account balance after this entry. */
  balance: number;
  /** e.g. "cusip:922908769" */
  security?: string | null;
  details?: { security?: string | null; tradeAction?: string | null; feeDescription?: string | null } | null;
}

/** Every Treasury entry, newest first, following Mercury's integer `cursor` to the end. */
export async function getTreasuryTransactions(login: MercuryLogin, treasuryId: string): Promise<TreasuryTransaction[]> {
  const all: TreasuryTransaction[] = [];
  let cursor: number | null | undefined;
  do {
    const data = await mercuryGet<{ transactions: TreasuryTransaction[]; cursor?: number | null }>(
      login.token,
      `/treasury/${treasuryId}/transactions?limit=1000&order=desc${cursor !== undefined && cursor !== null ? `&cursor=${cursor}` : ""}`,
    );
    all.push(...data.transactions);
    // Stop on a cursor that doesn't advance, rather than re-fetching the same page forever.
    cursor = data.cursor !== cursor ? data.cursor : null;
  } while (cursor !== null && cursor !== undefined);
  return all;
}

/** Fund names by CUSIP, from the dividends in Treasury's monthly returns. */
export function securityNames(account: TreasuryAccount): Map<string, string> {
  const names = new Map<string, string>();
  for (const month of account.netReturns) {
    for (const dividend of month.dividends ?? []) names.set(stripCusip(dividend.id), dividend.securityName);
  }
  return names;
}

function stripCusip(value: string) {
  return value.replace(/^cusip:/i, "");
}

/** Deposits and withdrawals move money in or out; they aren't returns. */
const FLOW_TYPES = new Set([
  "depositComplete",
  "depositReturned",
  "withdrawalPosted",
  "withdrawalReturned",
  "sweepInPosted",
  "sweepOutPosted",
]);

export interface Described {
  title: string;
  subtitle?: string;
  icon: Image.ImageLike;
  /** Undefined when the entry doesn't move money (a trade inside the account). */
  amountColor?: Color;
  isValuation: boolean;
}

/** A readable row for one entry. Mercury's own description wins when it says more than the type. */
export function describe(transaction: TreasuryTransaction, names: Map<string, string>): Described {
  const cusip = transaction.security ?? transaction.details?.security;
  const fund = cusip ? (names.get(stripCusip(cusip)) ?? stripCusip(cusip)) : undefined;
  const type = transaction.type;
  const generic =
    !transaction.description.trim() || transaction.description.toLowerCase() === humanize(type).toLowerCase();
  // Mercury's descriptions embed raw identifiers ("Dividend posted: cusip:46436E718 (iShares …)").
  // Swap each for the fund's name before a description is shown.
  const cleaned = transaction.description
    .replace(/cusip:[\w]+\s*\(([^)]+)\)/gi, "$1")
    .replace(/cusip:([\w]+)/gi, (_match, id: string) => names.get(id) ?? id);
  const title = (fallback: string) => (generic ? fallback : cleaned);
  const signColor = transaction.amount < 0 ? Color.Red : Color.Green;

  if (type === "valuationChangePosted") {
    return {
      title: "Valuation change",
      subtitle: fund,
      icon: { source: transaction.amount < 0 ? Icon.ArrowDown : Icon.ArrowUp, tintColor: signColor },
      amountColor: signColor,
      isValuation: true,
    };
  }
  if (type === "dividendPosted" || type === "dividendReinvestmentPosted") {
    return {
      title: fund ? `Dividend from ${fund}` : "Dividend",
      icon: { source: Icon.BankNote, tintColor: signColor },
      amountColor: signColor,
      isValuation: false,
    };
  }
  if (type.startsWith("mercuryFee")) {
    const refunded = type === "mercuryFeeRefunded";
    return {
      title: refunded ? "Mercury advisory fee refunded" : "Mercury advisory fee",
      icon: { source: Icon.ArrowLeft, tintColor: refunded ? Color.Green : Color.Red },
      amountColor: signColor,
      isValuation: false,
    };
  }
  if (type === "mutualFundTradePosted" || type.endsWith("OrderSettled")) {
    const action = transaction.details?.tradeAction?.toLowerCase().startsWith("s") ? "Sold" : "Bought";
    return {
      title: title(fund ? `${action} ${fund}` : action),
      icon: { source: Icon.Checkmark, tintColor: Color.SecondaryText },
      isValuation: false,
    };
  }
  if (/Failed|Canceled|Cancelled|Rejected|Returned$/.test(type)) {
    return {
      title: title(humanize(type)),
      subtitle: fund,
      icon: { source: Icon.XMarkCircle, tintColor: Color.SecondaryText },
      amountColor: Color.SecondaryText,
      isValuation: false,
    };
  }
  const labels: Record<string, string> = {
    depositComplete: "Deposit",
    withdrawalPosted: "Withdrawal",
    interestPosted: "Interest",
    sweepInPosted: "Swept in",
    sweepOutPosted: "Swept out",
    mercuryCreditPosted: "Mercury credit",
  };
  return {
    title: title(labels[type] ?? humanize(type)),
    subtitle: fund,
    icon: { source: FLOW_TYPES.has(type) ? Icon.Switch : Icon.Coins, tintColor: signColor },
    amountColor: signColor,
    isValuation: false,
  };
}

export type RangeKey = "7d" | "30d" | "3m" | "1y" | "ytd" | "all";

export const RANGES: Array<{ key: RangeKey; title: string }> = [
  { key: "7d", title: "Last 7 Days" },
  { key: "30d", title: "Last 30 Days" },
  { key: "3m", title: "Last 3 Months" },
  { key: "1y", title: "Last Year" },
  { key: "ytd", title: "Year to Date" },
  { key: "all", title: "All Time" },
];

/** A calendar day in local time as YYYY-MM-DD. Mercury's `canonicalDay` is a calendar day too. */
function localDay(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Noon avoids daylight-saving edges when stepping a day at a time. */
function parseDay(day: string) {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(year, month - 1, date, 12);
}

function addDays(day: string, days: number) {
  const date = parseDay(day);
  date.setDate(date.getDate() + days);
  return localDay(date);
}

/** Months back, clamped to the target month's last day (May 31 − 3 months = Feb 28, not Mar 3). */
function monthsBack(date: Date, months: number) {
  const result = new Date(date.getFullYear(), date.getMonth() - months, 1, 12);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(date.getDate(), lastDay));
  return result;
}

function rangeStart(key: RangeKey, firstDay: string, today: string): string {
  const now = parseDay(today);
  const starts: Record<RangeKey, string> = {
    "7d": addDays(today, -6),
    "30d": addDays(today, -29),
    "3m": localDay(monthsBack(now, 3)),
    "1y": localDay(monthsBack(now, 12)),
    ytd: `${now.getFullYear()}-01-01`,
    all: firstDay,
  };
  return starts[key] < firstDay ? firstDay : starts[key];
}

export interface Series {
  days: string[];
  balances: number[];
  /** Cumulative net deposits, for the dashed line. */
  deposits: number[];
  startBalance: number;
  endBalance: number;
  /** Change in balance minus money moved in or out during the range. */
  returns: number;
  returnsPercent?: number;
  dividends: number;
  fees: number;
}

/**
 * Daily closing balances for a range. Entries arrive newest first, so the first entry seen for a
 * day carries that day's closing balance. Days without entries repeat the previous close.
 */
export function buildSeries(transactions: TreasuryTransaction[], key: RangeKey): Series | undefined {
  if (transactions.length === 0) return undefined;
  const closing = new Map<string, number>();
  const flows = new Map<string, number>();
  for (const transaction of transactions) {
    const day = transaction.canonicalDay.slice(0, 10);
    if (!closing.has(day)) closing.set(day, transaction.balance);
    if (FLOW_TYPES.has(transaction.type)) flows.set(day, (flows.get(day) ?? 0) + transaction.amount);
  }

  const sortedDays = [...closing.keys()].sort();
  const firstDay = sortedDays[0];
  // Mercury dates entries in its own time zone, which can be a day ahead of the user's evening.
  const today = [localDay(new Date()), sortedDays.at(-1)!].sort().at(-1)!;
  const start = rangeStart(key, firstDay, today);

  // One pass from the first entry to today, carrying the balance and running deposits forward.
  const days: string[] = [];
  const balances: number[] = [];
  const deposits: number[] = [];
  let balance = 0;
  let deposited = 0;
  let startBalance = 0;
  let depositedBeforeStart = 0;
  for (let day = firstDay; day <= today; day = addDays(day, 1)) {
    if (day === start) {
      startBalance = balance;
      depositedBeforeStart = deposited;
    }
    balance = closing.get(day) ?? balance;
    deposited += flows.get(day) ?? 0;
    if (day >= start) {
      days.push(day);
      balances.push(balance);
      deposits.push(deposited);
    }
  }

  let dividends = 0;
  let fees = 0;
  for (const transaction of transactions) {
    if (transaction.canonicalDay.slice(0, 10) < start) continue;
    if (transaction.type === "dividendPosted") dividends += transaction.amount;
    if (transaction.type === "mercuryFeePosted") fees += Math.abs(transaction.amount);
  }

  const endBalance = balances.at(-1) ?? balance;
  const flowsInRange = deposited - depositedBeforeStart;
  const returns = endBalance - startBalance - flowsInRange;
  const invested = startBalance + Math.max(flowsInRange, 0);
  return {
    days,
    balances,
    deposits,
    startBalance,
    endBalance,
    returns,
    returnsPercent: invested > 0 ? (returns / invested) * 100 : undefined,
    dividends,
    fees,
  };
}
