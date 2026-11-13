import { formatNumber } from "./format";
import { shortTicker } from "./portfolio";
import type { DividendItem, HistoricalOrder, TransactionItem } from "./t212/types";
import { priceInMajorUnits } from "./yahoo/chart";

const num = (n: number | undefined | null): number => (typeof n === "number" && Number.isFinite(n) ? n : 0);

export function monthKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string, style: "long" | "initial"): string {
  const [y, m] = key.split("-").map(Number);
  const name = new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-US", {
    month: style === "long" ? "long" : "short",
    timeZone: "UTC",
  });
  return style === "long" ? `${name} ${y}` : name.charAt(0);
}

/** Month key for the month `offset` months before `now`'s month (UTC). */
function monthKeyBefore(now: Date, offset: number): string {
  const idx = now.getUTCFullYear() * 12 + now.getUTCMonth() - offset;
  return `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, "0")}`;
}

export function groupByMonth<T>(items: T[], dateOf: (t: T) => string): { key: string; label: string; items: T[] }[] {
  const sorted = [...items].sort((a, b) => Date.parse(dateOf(b)) - Date.parse(dateOf(a)));
  const groups: { key: string; label: string; items: T[] }[] = [];
  for (const item of sorted) {
    const key = monthKey(dateOf(item));
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(item);
    else groups.push({ key, label: monthLabel(key, "long"), items: [item] });
  }
  return groups;
}

export interface DividendSummary {
  last12: number;
  prior12: number;
  changePct: number | null;
  thisYear: number;
  allTime: number;
  monthlyAvg: number;
  topPayer: { ticker: string; name: string; amount: number } | null;
  months: { key: string; label: string; value: number }[];
}

export function summarizeDividends(items: DividendItem[], now: Date): DividendSummary {
  const byMonth = new Map<string, number>();
  const payers = new Map<string, { ticker: string; name: string; amount: number }>();
  const lastKeys = new Set<string>();
  const months: DividendSummary["months"] = [];
  for (let offset = 11; offset >= 0; offset--) {
    const key = monthKeyBefore(now, offset);
    lastKeys.add(key);
    months.push({ key, label: monthLabel(key, "initial"), value: 0 });
  }
  const priorKeys = new Set<string>();
  for (let offset = 12; offset < 24; offset++) priorKeys.add(monthKeyBefore(now, offset));

  const year = now.getUTCFullYear();
  let allTime = 0;
  let thisYear = 0;
  let prior12 = 0;
  for (const item of items) {
    const amount = num(item.amount);
    const key = monthKey(item.paidOn);
    allTime += amount;
    if (new Date(item.paidOn).getUTCFullYear() === year) thisYear += amount;
    if (priorKeys.has(key)) prior12 += amount;
    if (lastKeys.has(key)) {
      byMonth.set(key, (byMonth.get(key) ?? 0) + amount);
      const p = payers.get(item.ticker) ?? {
        ticker: item.ticker,
        name: item.instrument?.name || item.ticker,
        amount: 0,
      };
      p.amount += amount;
      payers.set(item.ticker, p);
    }
  }
  for (const m of months) m.value = byMonth.get(m.key) ?? 0;
  const last12 = months.reduce((s, m) => s + m.value, 0);
  let topPayer: DividendSummary["topPayer"] = null;
  for (const p of payers.values()) if (!topPayer || p.amount > topPayer.amount) topPayer = p;

  return {
    last12,
    prior12,
    // Against a prior year that was a tiny fraction of this one the % is meaningless ("+28 759 %").
    changePct: prior12 > 0 && prior12 * 10 >= last12 ? (last12 / prior12 - 1) * 100 : null,
    thisYear,
    allTime,
    monthlyAvg: last12 / 12,
    topPayer,
    months,
  };
}

export type TxRow =
  | {
      kind: "deposit" | "withdrawal" | "fee" | "transfer-in" | "transfer-out";
      date: string;
      amount: number;
      reference: string;
    }
  | { kind: "interest"; month: string; date: string; amount: number; count: number };

export function buildTransactionRows(items: TransactionItem[]): TxRow[] {
  const rows: TxRow[] = [];
  const interest = new Map<string, Extract<TxRow, { kind: "interest" }>>();
  for (const t of items) {
    const amount = num(t.amount);
    switch (t.type) {
      case "INTEREST_ON_FREE_CASH":
      case "LENDING_INTEREST": {
        const month = monthKey(t.dateTime);
        const row = interest.get(month);
        if (row) {
          row.amount += amount;
          row.count += 1;
          if (Date.parse(t.dateTime) > Date.parse(row.date)) row.date = t.dateTime;
        } else {
          interest.set(month, { kind: "interest", month, date: t.dateTime, amount, count: 1 });
        }
        break;
      }
      case "DEPOSIT":
        rows.push({ kind: "deposit", date: t.dateTime, amount: Math.abs(amount), reference: t.reference });
        break;
      case "WITHDRAW":
        rows.push({ kind: "withdrawal", date: t.dateTime, amount: Math.abs(amount), reference: t.reference });
        break;
      case "FEE":
        rows.push({ kind: "fee", date: t.dateTime, amount: Math.abs(amount), reference: t.reference });
        break;
      case "TRANSFER":
        rows.push({
          kind: amount < 0 ? "transfer-out" : "transfer-in",
          date: t.dateTime,
          amount: Math.abs(amount),
          reference: t.reference,
        });
        break;
    }
  }
  rows.push(...interest.values());
  return rows.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
}

const DEPOSIT_MONTHS = 24;

export interface DepositSummary {
  netDeposited: number;
  deposited: number;
  withdrawn: number;
  fees: number;
  interest: number;
  thisYear: number;
  /** Net money in per month (deposits − withdrawals, transfers by sign) for the last 24 months, oldest first. */
  months: { key: string; value: number }[];
}

export function summarizeDeposits(items: TransactionItem[], now: Date): DepositSummary {
  const year = now.getUTCFullYear();
  let deposited = 0;
  let withdrawn = 0;
  let fees = 0;
  let interest = 0;
  let thisYear = 0;
  const byMonth = new Map<string, number>();
  for (const t of items) {
    const amount = num(t.amount);
    let delta: number | null = null;
    switch (t.type) {
      case "DEPOSIT":
        delta = Math.abs(amount);
        break;
      case "WITHDRAW":
        delta = -Math.abs(amount);
        break;
      case "TRANSFER":
        delta = amount;
        break;
      case "FEE":
        fees += Math.abs(amount);
        break;
      case "INTEREST_ON_FREE_CASH":
      case "LENDING_INTEREST":
        interest += amount;
        break;
    }
    if (delta === null) continue;
    if (delta >= 0) deposited += delta;
    else withdrawn += -delta;
    if (new Date(t.dateTime).getUTCFullYear() === year) thisYear += delta;
    const key = monthKey(t.dateTime);
    byMonth.set(key, (byMonth.get(key) ?? 0) + delta);
  }
  const months: DepositSummary["months"] = [];
  for (let offset = DEPOSIT_MONTHS - 1; offset >= 0; offset--) {
    const key = monthKeyBefore(now, offset);
    months.push({ key, value: byMonth.get(key) ?? 0 });
  }
  return { netDeposited: deposited - withdrawn, deposited, withdrawn, fees, interest, thisYear, months };
}

export interface OrderView {
  title: string;
  statusLabel: string;
  status: "filled" | "cancelled" | "rejected" | "pending";
  side: "BUY" | "SELL";
  shares: number | null;
  fillPrice: { price: number; currency: string } | null;
  total: number | null;
  fees: number;
  date: string;
  sinceThenPct: number | null;
}

const STATUS_FROM_API: Record<string, OrderView["status"]> = {
  FILLED: "filled",
  CANCELLED: "cancelled",
  REJECTED: "rejected",
};

const STATUS: Record<OrderView["status"], string> = {
  filled: "Filled",
  cancelled: "Cancelled",
  rejected: "Rejected",
  pending: "Pending",
};

export function orderView(
  o: HistoricalOrder,
  currentPrices: Record<string, { price: number; currency: string }>,
): OrderView {
  const { order, fill } = o;
  const status = STATUS_FROM_API[order.status] ?? "pending";
  const rawShares = fill ? fill.quantity : (order.filledQuantity ?? order.quantity);
  const shares = typeof rawShares === "number" && Number.isFinite(rawShares) ? Math.abs(rawShares) : null;
  const fillPrice =
    fill && Number.isFinite(fill.price)
      ? priceInMajorUnits(fill.price, order.instrument?.currency ?? order.currency)
      : null;
  const total = fill ? Math.abs(num(fill.walletImpact?.netValue)) : null;
  const fees = (fill?.walletImpact?.taxes ?? []).reduce((s, t) => s + Math.abs(num(t.quantity)), 0);

  let sinceThenPct: number | null = null;
  const current = currentPrices[order.ticker];
  if (
    status === "filled" &&
    order.side === "BUY" &&
    fillPrice &&
    fillPrice.price > 0 &&
    current &&
    current.currency === fillPrice.currency
  ) {
    sinceThenPct = (current.price / fillPrice.price - 1) * 100;
  }

  return {
    title: `${order.side === "BUY" ? "Buy" : "Sell"} ${shortTicker(order.ticker)}`,
    statusLabel: STATUS[status],
    status,
    side: order.side,
    shares,
    fillPrice,
    total,
    fees,
    date: fill?.filledAt ?? order.createdAt,
    sinceThenPct: sinceThenPct !== null && Number.isFinite(sinceThenPct) ? sinceThenPct : null,
  };
}

/** API enum → sentence case: "RETURN_OF_CAPITAL" → "Return of capital". */
export function humanizeEnum(value: string): string {
  const text = value.replace(/_/g, " ").trim().toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const TX_TITLES: Record<Exclude<TxRow["kind"], "interest">, string> = {
  deposit: "Deposit",
  withdrawal: "Withdrawal",
  fee: "Fee",
  "transfer-in": "Transfer in",
  "transfer-out": "Transfer out",
};

export function txRowTitle(row: TxRow): string {
  if (row.kind !== "interest") return TX_TITLES[row.kind];
  return "Interest on cash";
}

/** Money into the account is positive, money out negative. */
export function txRowSignedAmount(row: TxRow): number {
  switch (row.kind) {
    case "withdrawal":
    case "fee":
    case "transfer-out":
      return -row.amount;
    default:
      return row.amount;
  }
}

export function orderTypeLabel(type: string, side: "BUY" | "SELL"): string {
  return `${humanizeEnum(type)} ${side === "BUY" ? "buy" : "sell"}`;
}

/** "Bought 2.5 NVDA" for fills, "Buy 3 NVDA" for orders that never filled. */
export function orderHeadline(view: OrderView, ticker: string): string {
  const verb =
    view.status === "filled" ? (view.side === "BUY" ? "Bought" : "Sold") : view.side === "BUY" ? "Buy" : "Sell";
  const shares = view.shares !== null ? `${formatNumber(view.shares)} ` : "";
  return `${verb} ${shares}${ticker}`;
}
