import { directionOf, formatMoney, formatPct, type Direction } from "./format";
import type { AccountSummary, Position } from "./t212/types";
import { priceInMajorUnits } from "./yahoo/chart";

export interface DayQuote {
  price: number;
  previousClose: number;
  marketTime: number;
}

export interface PositionView {
  ticker: string;
  name: string;
  value: number;
  returnAmount: number;
  returnPct: number;
  weightPct: number;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  priceCurrency: string;
  heldSince: string;
  todayPct: number | null;
  todayAmount: number | null;
  /** Epoch ms of the session `todayPct` belongs to; null without a quote. */
  todayAsOf: number | null;
}

export interface PortfolioView {
  currency: string;
  totalBalance: number;
  cash: number;
  invested: number;
  returnAmount: number;
  returnPct: number;
  todayAmount: number | null;
  todayPct: number | null;
  todayAsOf: number | null;
  positions: PositionView[];
}

const ratio = (numerator: number, denominator: number): number =>
  denominator === 0 || !Number.isFinite(numerator / denominator) ? 0 : numerator / denominator;

function buildPositionView(position: Position, holdingsValue: number, quote: DayQuote | undefined): PositionView {
  const { instrument, walletImpact } = position;
  const value = walletImpact.currentValue;
  const cost = walletImpact.totalCost;
  const avg = priceInMajorUnits(position.averagePricePaid, instrument.currency);
  const current = priceInMajorUnits(position.currentPrice, instrument.currency);
  const hasQuote = quote !== undefined && quote.price > 0 && quote.previousClose > 0;
  return {
    ticker: instrument.ticker,
    name: instrument.name,
    value,
    returnAmount: walletImpact.unrealizedProfitLoss,
    returnPct: ratio(walletImpact.unrealizedProfitLoss, cost) * 100,
    weightPct: ratio(value, holdingsValue) * 100,
    quantity: position.quantity,
    avgPrice: avg.price,
    currentPrice: current.price,
    priceCurrency: current.currency,
    heldSince: position.createdAt,
    todayPct: hasQuote ? (quote.price / quote.previousClose - 1) * 100 : null,
    todayAmount: hasQuote ? value * (1 - quote.previousClose / quote.price) : null,
    todayAsOf: hasQuote && Number.isFinite(quote.marketTime) ? quote.marketTime : null,
  };
}

export function buildPortfolioView(
  summary: AccountSummary,
  positions: Position[],
  quotes: Record<string, DayQuote>,
): PortfolioView {
  const cash = summary.cash.availableToTrade + summary.cash.reservedForOrders + summary.cash.inPies;
  const totalBalance = summary.investments.currentValue + cash;
  const holdingsValue = positions.reduce((sum, p) => sum + p.walletImpact.currentValue, 0);

  const views = positions
    .map((p) => buildPositionView(p, holdingsValue, quotes[p.instrument.ticker]))
    .sort((a, b) => b.value - a.value);

  const withToday = views.filter((v) => v.todayAmount !== null);
  const todayAmount = withToday.length > 0 ? withToday.reduce((sum, v) => sum + (v.todayAmount ?? 0), 0) : null;
  const marketTimes = views
    .map((v) => quotes[v.ticker])
    .filter((q): q is DayQuote => q !== undefined && Number.isFinite(q.marketTime))
    .map((q) => q.marketTime);

  return {
    currency: summary.currency,
    totalBalance,
    cash,
    invested: summary.investments.totalCost,
    returnAmount: summary.investments.unrealizedProfitLoss,
    returnPct: ratio(summary.investments.unrealizedProfitLoss, summary.investments.totalCost) * 100,
    todayAmount,
    todayPct: todayAmount === null ? null : ratio(todayAmount, totalBalance - todayAmount) * 100,
    todayAsOf: todayAmount === null || marketTimes.length === 0 ? null : Math.max(...marketTimes),
    positions: views,
  };
}

export function topMovers(view: PortfolioView, n = 3): PositionView[] {
  return view.positions
    .filter((p) => p.todayPct !== null)
    .sort((a, b) => Math.abs(b.todayPct ?? 0) - Math.abs(a.todayPct ?? 0))
    .slice(0, n);
}

export function menuBarTitle(view: PortfolioView | null, showAmount: boolean): string {
  if (!view) return "Trading 212";
  const amount = formatMoney(view.totalBalance, view.currency, { decimals: 0 });
  if (view.todayPct === null) return showAmount ? amount : "Trading 212";
  const magnitude = formatPct(Math.abs(view.todayPct), { decimals: 1 });
  // Medium triangles with a thin space before the number read lighter in the menu bar.
  const arrow = directionOf(view.todayPct) === "down" ? "⏷" : "⏶";
  const change = `${arrow}\u2009${magnitude}`;
  return showAmount ? `${amount} ${change}` : change;
}

/** Short display ticker: "AAPL_US_EQ" → "AAPL", "VUAAl_EQ" → "VUAA" (venue letter stripped). */
export function shortTicker(t212Ticker: string): string {
  const base = t212Ticker.split("_")[0];
  return base.replace(/(?<=[A-Z0-9.])[a-z]$/, "");
}

/** Weekday ("Fri") of the last session when it isn't on `now`'s local date; null for today or no session time. */
export function sessionWeekday(asOf: number | null, now: number): string | null {
  if (asOf === null) return null;
  const session = new Date(asOf);
  if (session.toDateString() === new Date(now).toDateString()) return null;
  return new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(session);
}

/** "Today", or "Last session (Fri)" on weekends/holidays when the latest change is from an earlier session. */
export function todayLabel(asOf: number | null, now: number): string {
  const weekday = sessionWeekday(asOf, now);
  return weekday === null ? "Today" : `Last session (${weekday})`;
}

export interface MenuBarRow {
  title: string;
  value: string;
  tone?: Direction;
}

/**
 * Summary rows for the menu bar dropdown: Today (omitted without quotes) and All-time, percentage
 * first with whole amounts. The balance is only listed when the menu bar title hides it.
 */
export function menuBarSummaryRows(view: PortfolioView, now: number, opts: { showBalance: boolean }): MenuBarRow[] {
  const change = (pct: number, amount: number): Omit<MenuBarRow, "title"> => ({
    value: `${formatPct(pct, { signed: true })} · ${formatMoney(amount, view.currency, { signed: true, decimals: 0 })}`,
    tone: directionOf(pct),
  });
  const rows: MenuBarRow[] = [];
  if (opts.showBalance) {
    rows.push({ title: "Balance", value: formatMoney(view.totalBalance, view.currency, { decimals: 0 }) });
  }
  if (view.todayAmount !== null && view.todayPct !== null) {
    rows.push({ title: todayLabel(view.todayAsOf, now), ...change(view.todayPct, view.todayAmount) });
  }
  rows.push({ title: "All-time", ...change(view.returnPct, view.returnAmount) });
  return rows;
}
