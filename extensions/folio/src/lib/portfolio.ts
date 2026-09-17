/**
 * Pure portfolio math. No Raycast imports, no network, no Date.now() unless passed in.
 * Guiding rule: understate rather than invent. If the data can't support a number, return null.
 */
import type { Account, AccountSnapshot, Activity, OptionsPosition, Position } from "./types";

// ---------- Net worth ----------

export interface CurrencyTotal {
  currency: string;
  amount: number;
}

export interface NetWorth {
  /** One entry per currency, largest first. SnapTrade doesn't give FX rates on OAuth, so we never merge currencies. */
  byCurrency: CurrencyTotal[];
  /** The currency holding the most value (what the menu bar shows). */
  primary: CurrencyTotal | null;
  accountCount: number;
}

function accountTotal(account: Account): CurrencyTotal | null {
  const total = account.balance?.total;
  if (!total || typeof total.amount !== "number" || !total.currency) return null;
  return { currency: total.currency.toUpperCase(), amount: total.amount };
}

export function isInvestmentAccount(account: Account): boolean {
  // Include unknown categories; only exclude explicit non-investment ones.
  return account.account_category !== "LOC" && account.status !== "closed" && account.status !== "archived";
}

export function netWorth(accounts: Account[]): NetWorth {
  const totals = new Map<string, number>();
  let count = 0;
  for (const account of accounts) {
    if (!isInvestmentAccount(account)) continue;
    const t = accountTotal(account);
    if (!t) continue;
    count += 1;
    totals.set(t.currency, (totals.get(t.currency) ?? 0) + t.amount);
  }
  const byCurrency = [...totals.entries()]
    .map(([currency, amount]) => ({ currency, amount }))
    .sort((a, b) => b.amount - a.amount);
  return { byCurrency, primary: byCurrency[0] ?? null, accountCount: count };
}

/** Sums per-account day changes, per currency. Null when no account reported one. */
export function dayChange(snapshots: AccountSnapshot[]): CurrencyTotal[] | null {
  const totals = new Map<string, number>();
  for (const s of snapshots) {
    if (!s.dayChange) continue;
    totals.set(s.dayChange.currency, (totals.get(s.dayChange.currency) ?? 0) + s.dayChange.amount);
  }
  if (totals.size === 0) return null;
  return [...totals.entries()].map(([currency, amount]) => ({ currency, amount }));
}

// ---------- Positions ----------

export interface FlatPosition {
  key: string;
  ticker: string;
  rawTicker: string;
  description: string;
  units: number;
  price: number | null;
  averageCost: number | null;
  marketValue: number | null;
  openPnl: number | null;
  /** open P&L as a ratio of cost basis, null if cost is unknown/zero */
  openPnlRatio: number | null;
  currency: string;
  exchange: string | null;
  securityType: string | null;
  isOption: boolean;
  cashEquivalent: boolean;
  accountId: string;
  accountName: string;
  institution: string;
  /** Share of all positions in the same currency (0..1). Null if value unknown. */
  weight: number | null;
}

function positionCurrency(p: Position, account: Account): string {
  return (
    p.currency?.code ??
    p.symbol?.symbol?.currency?.code ??
    account.balance?.total?.currency ??
    "USD"
  ).toUpperCase();
}

function fromPosition(p: Position, account: Account): FlatPosition | null {
  const sym = p.symbol?.symbol;
  const ticker = sym?.symbol ?? p.symbol?.description;
  if (!ticker) return null;
  const units = typeof p.units === "number" ? p.units : 0;
  const price = typeof p.price === "number" ? p.price : null;
  const avg = typeof p.average_purchase_price === "number" ? p.average_purchase_price : null;
  const marketValue = price !== null ? units * price : null;
  const openPnl =
    typeof p.open_pnl === "number" ? p.open_pnl : price !== null && avg !== null ? (price - avg) * units : null;
  const costBasis = avg !== null ? avg * units : null;
  return {
    key: `${account.id}:${sym?.id ?? ticker}`,
    ticker,
    rawTicker: sym?.raw_symbol ?? ticker.replace(/\.[A-Z]+$/, ""),
    description: sym?.description ?? p.symbol?.description ?? "",
    units,
    price,
    averageCost: avg,
    marketValue,
    openPnl,
    openPnlRatio: openPnl !== null && costBasis ? openPnl / Math.abs(costBasis) : null,
    currency: positionCurrency(p, account),
    exchange: sym?.exchange?.code ?? null,
    securityType: sym?.type?.description ?? sym?.type?.code ?? null,
    isOption: false,
    cashEquivalent: Boolean(p.cash_equivalent),
    accountId: account.id,
    accountName: account.name ?? account.number,
    institution: account.institution_name,
    weight: null,
  };
}

function fromOption(p: OptionsPosition, account: Account): FlatPosition | null {
  const o = p.symbol?.option_symbol;
  if (!o) return null;
  const units = typeof p.units === "number" ? p.units : 0;
  const price = typeof p.price === "number" ? p.price : null;
  // Option prices are per share; contracts are usually 100 shares.
  const multiplier = typeof p.multiplier === "number" && p.multiplier > 0 ? p.multiplier : 100;
  const marketValue = price !== null ? units * price * multiplier : null;
  const avg = typeof p.average_purchase_price === "number" ? p.average_purchase_price : null; // per contract
  const openPnl = marketValue !== null && avg !== null ? marketValue - avg * units : null;
  const underlying = o.underlying_symbol?.symbol ?? o.ticker;
  return {
    key: `${account.id}:${o.id ?? o.ticker}`,
    ticker: o.ticker,
    rawTicker: underlying,
    description: `${underlying} ${o.strike_price} ${o.option_type} ${o.expiration_date}`,
    units,
    price,
    averageCost: avg,
    marketValue,
    openPnl,
    openPnlRatio: openPnl !== null && avg ? openPnl / Math.abs(avg * units) : null,
    currency: (p.currency?.code ?? account.balance?.total?.currency ?? "USD").toUpperCase(),
    exchange: null,
    securityType: "Option",
    isOption: true,
    cashEquivalent: false,
    accountId: account.id,
    accountName: account.name ?? account.number,
    institution: account.institution_name,
    weight: null,
  };
}

/** Flattens every position across accounts and fills in per-currency weights. Sorted by market value desc. */
export function flattenPositions(snapshots: AccountSnapshot[]): FlatPosition[] {
  const out: FlatPosition[] = [];
  for (const s of snapshots) {
    for (const p of s.holdings.positions ?? []) {
      const f = fromPosition(p, s.account);
      if (f) out.push(f);
    }
    for (const p of s.holdings.option_positions ?? []) {
      const f = fromOption(p, s.account);
      if (f) out.push(f);
    }
  }
  return withWeights(out);
}

export function withWeights(positions: FlatPosition[]): FlatPosition[] {
  const totals = new Map<string, number>();
  for (const p of positions) {
    if (p.marketValue === null || p.marketValue <= 0) continue;
    totals.set(p.currency, (totals.get(p.currency) ?? 0) + p.marketValue);
  }
  return positions
    .map((p) => {
      const total = totals.get(p.currency);
      const weight = p.marketValue !== null && total ? p.marketValue / total : null;
      return { ...p, weight };
    })
    .sort((a, b) => (b.marketValue ?? -Infinity) - (a.marketValue ?? -Infinity));
}

/** Case-insensitive ticker match: exact raw symbol first, then prefix, then substring on description. */
export function searchPositions(positions: FlatPosition[], query: string): FlatPosition[] {
  const q = query.trim().toUpperCase();
  if (!q) return positions;
  const score = (p: FlatPosition): number => {
    const raw = p.rawTicker.toUpperCase();
    const full = p.ticker.toUpperCase();
    if (raw === q || full === q) return 3;
    if (raw.startsWith(q) || full.startsWith(q)) return 2;
    if (full.includes(q) || p.description.toUpperCase().includes(q)) return 1;
    return 0;
  };
  return positions
    .map((p) => ({ p, s: score(p) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || (b.p.marketValue ?? 0) - (a.p.marketValue ?? 0))
    .map((x) => x.p);
}

// ---------- Cash & Fog ----------

export interface CashByCurrency extends CurrencyTotal {
  accounts: { accountId: string; accountName: string; institution: string; amount: number }[];
}

/** Cash balances per currency across accounts. Negative (margin) balances are kept so totals stay honest. */
export function cashBalances(snapshots: AccountSnapshot[]): CashByCurrency[] {
  const map = new Map<string, CashByCurrency>();
  for (const s of snapshots) {
    for (const b of s.holdings.balances ?? []) {
      const code = (b.currency?.code ?? s.account.balance?.total?.currency ?? "USD").toUpperCase();
      const cash = typeof b.cash === "number" ? b.cash : null;
      if (cash === null) continue;
      const entry = map.get(code) ?? { currency: code, amount: 0, accounts: [] };
      entry.amount += cash;
      entry.accounts.push({
        accountId: s.account.id,
        accountName: s.account.name ?? s.account.number,
        institution: s.account.institution_name,
        amount: cash,
      });
      map.set(code, entry);
    }
  }
  return [...map.values()].sort((a, b) => b.amount - a.amount);
}

export const TRADE_TYPES = new Set(["BUY", "SELL"]);
export const BUY_TYPES = new Set(["BUY", "REI"]);
export const DIVIDEND_TYPES = new Set(["DIVIDEND", "SUBSTITUTE_DIVIDEND", "STOCK_DIVIDEND", "REI", "INTEREST"]);
export const DEPOSIT_TYPES = new Set([
  "CONTRIBUTION",
  "WITHDRAWAL",
  "TRANSFER",
  "EXTERNAL_ASSET_TRANSFER_IN",
  "EXTERNAL_ASSET_TRANSFER_OUT",
]);
export const CASH_IN_TYPES = new Set(["CONTRIBUTION", "EXTERNAL_ASSET_TRANSFER_IN"]);

export type ActivityFilter = "all" | "trades" | "dividends" | "deposits";

export function filterActivities(activities: Activity[], filter: ActivityFilter): Activity[] {
  if (filter === "all") return activities;
  const set = filter === "trades" ? TRADE_TYPES : filter === "dividends" ? DIVIDEND_TYPES : DEPOSIT_TYPES;
  return activities.filter((a) => set.has((a.type ?? "").toUpperCase()));
}

export function activityDate(a: Activity): Date | null {
  const raw = a.trade_date ?? a.settlement_date;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function sortActivitiesDesc(activities: Activity[]): Activity[] {
  return [...activities].sort((a, b) => (activityDate(b)?.getTime() ?? 0) - (activityDate(a)?.getTime() ?? 0));
}

function daysBetween(from: Date, to: Date): number {
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / 86_400_000));
}

function latestOfType(activities: Activity[], types: Set<string>, now: Date): Date | null {
  let latest: Date | null = null;
  for (const a of activities) {
    if (!types.has((a.type ?? "").toUpperCase())) continue;
    const d = activityDate(a);
    if (!d || d.getTime() > now.getTime()) continue;
    if (!latest || d > latest) latest = d;
  }
  return latest;
}

export interface Fog {
  /** Days the cash has been idle. Bounded by the activity window: if nothing moved inside it, this is the window length and `atLeast` is true. */
  idleDays: number;
  /** True when no buy or deposit was found inside the window, so the real number is >= idleDays. */
  atLeast: boolean;
  cash: CashByCurrency[];
  /** Largest cash pile, what the headline shows. */
  primary: CashByCurrency | null;
  lastBuy: Date | null;
  lastDeposit: Date | null;
  windowDays: number;
}

/**
 * Fog = cash sitting undeployed.
 * idleDays = days since the LATER of the last buy and the last deposit inside the window.
 * Using the later event understates the streak (cash can't have been idle longer than since it arrived
 * or since you last put some to work), which is the honest direction to err in.
 */
export function computeFog(snapshots: AccountSnapshot[], activities: Activity[], now: Date, windowDays: number): Fog {
  const cash = cashBalances(snapshots);
  const lastBuy = latestOfType(activities, BUY_TYPES, now);
  const lastDeposit = latestOfType(activities, CASH_IN_TYPES, now);
  const anchors = [lastBuy, lastDeposit].filter((d): d is Date => d !== null);
  let idleDays: number;
  let atLeast = false;
  if (anchors.length === 0) {
    idleDays = windowDays;
    atLeast = true;
  } else {
    const latest = new Date(Math.max(...anchors.map((d) => d.getTime())));
    idleDays = daysBetween(latest, now);
  }
  return { idleDays, atLeast, cash, primary: cash[0] ?? null, lastBuy, lastDeposit, windowDays };
}

export interface QuietStreak {
  days: number;
  atLeast: boolean;
  lastTrade: Date | null;
}

/** Days since the last BUY or SELL. Same bounding rule as Fog. */
export function quietStreak(activities: Activity[], now: Date, windowDays: number): QuietStreak {
  const lastTrade = latestOfType(activities, TRADE_TYPES, now);
  if (!lastTrade) return { days: windowDays, atLeast: true, lastTrade: null };
  return { days: daysBetween(lastTrade, now), atLeast: false, lastTrade };
}

export function fogIdleLabel(fog: Pick<Fog, "idleDays" | "atLeast">): string {
  return `${fog.idleDays}${fog.atLeast ? "+" : ""}`;
}

/** Groups accounts by institution, preserving the institution order of first appearance. */
export function groupByInstitution<T extends { account: Account }>(items: T[]): { institution: string; items: T[] }[] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = item.account.institution_name || "Other";
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }
  return [...groups.entries()].map(([institution, items]) => ({ institution, items }));
}
