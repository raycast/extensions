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
  /** Investment accounts SnapTrade reported no total for: left out of the sums, so the sums are incomplete. */
  missing: number;
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
  let missing = 0;
  for (const account of accounts) {
    if (!isInvestmentAccount(account)) continue;
    const t = accountTotal(account);
    if (!t) {
      missing += 1;
      continue;
    }
    count += 1;
    totals.set(t.currency, (totals.get(t.currency) ?? 0) + t.amount);
  }
  const byCurrency = [...totals.entries()]
    .map(([currency, amount]) => ({ currency, amount }))
    .sort((a, b) => b.amount - a.amount);
  return { byCurrency, primary: byCurrency[0] ?? null, accountCount: count, missing };
}

export interface DayChange extends CurrencyTotal {
  /** True when every account in this currency reported a change over the same dates. Otherwise the sum only covers some accounts. */
  complete: boolean;
  /** Accounts in this currency with no balance history (SnapTrade doesn't return it on every plan/brokerage). */
  missing: number;
  /** Accounts whose latest change covers different dates (older history, or a longer gap), left out of the sum. */
  otherDates: number;
  covered: number;
  /** The summed changes run from `from` to `asOf` (YYYY-MM-DD snapshot dates). */
  asOf: string;
  from?: string;
}

/**
 * Sums per-account day changes per currency and says whether the sum is complete.
 * Only changes over the same dates are added up: brokerages' balance histories end on different days
 * and some skip days, so a plain sum would mix one account's Sep 27→28 with another's Sep 29→Oct 1.
 * The most recent period wins; accounts on other dates count as left out.
 * Never presents a partial sum as the portfolio's change: callers hide or label incomplete entries.
 * Null when no account reported a change at all.
 */
export function dayChange(snapshots: AccountSnapshot[]): DayChange[] | null {
  const byCurrency = new Map<string, { missing: number; periods: Map<string, { amount: number; count: number }> }>();
  for (const s of snapshots) {
    const currency = (s.dayChange?.currency ?? s.account.balance?.total?.currency)?.toUpperCase();
    if (!currency) continue;
    const entry = byCurrency.get(currency) ?? { missing: 0, periods: new Map() };
    if (s.dayChange) {
      const key = `${s.dayChange.asOf}|${s.dayChange.from ?? ""}`;
      const period = entry.periods.get(key) ?? { amount: 0, count: 0 };
      period.amount += s.dayChange.amount;
      period.count += 1;
      entry.periods.set(key, period);
    } else {
      entry.missing += 1;
    }
    byCurrency.set(currency, entry);
  }
  const out: DayChange[] = [];
  for (const [currency, e] of byCurrency) {
    // Latest end date first, then the period most accounts share, then the shorter period (later start),
    // so the result doesn't depend on account order.
    const ranked = [...e.periods.entries()].sort(([ka, a], [kb, b]) =>
      ka.split("|")[0] !== kb.split("|")[0] ? (ka < kb ? 1 : -1) : b.count - a.count || (ka < kb ? 1 : -1),
    );
    if (ranked.length === 0) continue;
    const [key, best] = ranked[0];
    const [asOf, from] = key.split("|");
    const total = ranked.reduce((n, [, p]) => n + p.count, 0);
    out.push({
      currency,
      amount: best.amount,
      complete: e.missing === 0 && total === best.count,
      missing: e.missing,
      otherDates: total - best.count,
      covered: best.count,
      asOf,
      from: from || undefined,
    });
  }
  return out.length > 0 ? out : null;
}

/** True when a balance snapshot date (YYYY-MM-DD) is within the last `days` days, so it can pass as "today's" change. */
export function isRecentSnapshot(date: string, now: Date, days = 2): boolean {
  const t = Date.parse(`${date}T00:00:00Z`);
  return !Number.isNaN(t) && now.getTime() - t < (days + 1) * 86_400_000;
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

/** Case-insensitive match: exact ticker first, then ticker prefix, then substring on name, account or institution. */
export function searchPositions(positions: FlatPosition[], query: string): FlatPosition[] {
  const q = query.trim().toUpperCase();
  if (!q) return positions;
  const score = (p: FlatPosition): number => {
    const raw = p.rawTicker.toUpperCase();
    const full = p.ticker.toUpperCase();
    if (raw === q || full === q) return 3;
    if (raw.startsWith(q) || full.startsWith(q)) return 2;
    if (
      full.includes(q) ||
      p.description.toUpperCase().includes(q) ||
      p.accountName.toUpperCase().includes(q) ||
      p.institution.toUpperCase().includes(q)
    ) {
      return 1;
    }
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
  // Cash moved between accounts at the same brokerage (e.g. Wealthsimple).
  "INTERNAL_CASH_TRANSFER_IN",
  "INTERNAL_CASH_TRANSFER_OUT",
]);
/** Money arriving in an account: what restarts Fog's idle clock alongside a buy. */
export const CASH_IN_TYPES = new Set(["CONTRIBUTION", "EXTERNAL_ASSET_TRANSFER_IN", "INTERNAL_CASH_TRANSFER_IN"]);

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

function dayOf(a: Activity): string | undefined {
  return activityDate(a)?.toISOString().slice(0, 10);
}

/**
 * Drops internal transfers in that are matched by a transfer out of another listed account (same
 * amount, same day). Moving cash between two accounts Folio already counts isn't new money, so it
 * shouldn't restart Fog's idle clock; a transfer from an account Folio doesn't see still does.
 */
function withoutTrackedTransfers(activities: Activity[]): Activity[] {
  const outs = activities.filter((a) => (a.type ?? "").toUpperCase() === "INTERNAL_CASH_TRANSFER_OUT");
  if (outs.length === 0) return activities;
  const used = new Set<Activity>();
  return activities.filter((a) => {
    if ((a.type ?? "").toUpperCase() !== "INTERNAL_CASH_TRANSFER_IN") return true;
    const match = outs.find(
      (o) =>
        !used.has(o) &&
        o.account?.id !== a.account?.id &&
        dayOf(o) === dayOf(a) &&
        Math.abs(Math.abs(o.amount ?? 0) - Math.abs(a.amount ?? 0)) < 0.005,
    );
    if (!match) return true;
    used.add(match);
    return false;
  });
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
  const lastDeposit = latestOfType(withoutTrackedTransfers(activities), CASH_IN_TYPES, now);
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
