import type { Index, Market } from './types';

export function formatProb(n: number | null | undefined, digits = 1): string {
  if (n == null || Number.isNaN(n)) return '—';
  return `${n.toFixed(digits)}%`;
}

export function formatLevel(n: number | null | undefined, digits = 2): string {
  if (n == null || Number.isNaN(n)) return '—';
  return n.toFixed(digits);
}

export function formatSigned(n: number | null | undefined, digits = 2, suffix = ''): string {
  if (n == null || Number.isNaN(n)) return '—';
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(digits)}${suffix}`;
}

export function formatCompact(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—';
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

export function formatQty(n: number | null | undefined, unit?: string | null): string {
  const value = formatCompact(n);
  if (value === '—' || !unit) return value;
  return `${value} ${unit}`;
}

export function formatWeight(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '';
  return `${(n <= 1 ? n * 100 : n).toFixed(1)}%`;
}

export function marketTitle(
  market: Pick<Market, 'question' | 'display_ticker' | 'market_id' | 'ticker'>,
): string {
  return market.question || market.display_ticker || market.ticker || market.market_id;
}

export function constituentPrice(row: {
  latest_price?: number | null;
  probability?: number | null;
  price?: number | null;
}): number | null {
  return row.latest_price ?? row.probability ?? row.price ?? null;
}

export function sortSeries<T extends { timestamp: string }>(points: T[]): T[] {
  return [...points].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

export function formatWhen(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function mdCell(value: string | number | null | undefined): string {
  if (value == null || value === '') return '';
  return String(value).replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

export function mdTable(
  headers: string[],
  rows: Array<Array<string | number | null | undefined>>,
): string {
  if (rows.length === 0) return '';
  const head = `| ${headers.join(' | ')} |`;
  const rule = `| ${headers.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => `| ${row.map(mdCell).join(' | ')} |`).join('\n');
  return `${head}\n${rule}\n${body}`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** 1d percent change. `change_1d` is often absent; derive from previous close. */
export function indexChangePct(
  index: Pick<Index, 'change_1d' | 'price_change_1d' | 'latest_price' | 'previous_close_1d'>,
): number | null {
  if (index.change_1d != null && !Number.isNaN(index.change_1d)) return index.change_1d;
  const prev = index.previous_close_1d;
  if (prev == null || prev === 0 || Number.isNaN(prev)) return null;
  if (index.latest_price != null && !Number.isNaN(index.latest_price)) {
    return ((index.latest_price - prev) / prev) * 100;
  }
  if (index.price_change_1d != null && !Number.isNaN(index.price_change_1d)) {
    return (index.price_change_1d / prev) * 100;
  }
  return null;
}

export function formatIndexMove(index: Parameters<typeof indexChangePct>[0]): string | null {
  const pct = indexChangePct(index);
  return pct == null ? null : `(${formatSigned(pct, 2, '%')})`;
}

export function formatIndexQuote(
  index: Pick<
    Index,
    'ticker' | 'latest_price' | 'change_1d' | 'price_change_1d' | 'previous_close_1d'
  >,
): string {
  const level = formatLevel(index.latest_price);
  const move = formatIndexMove(index);
  return move ? `${index.ticker} ${level} ${move}` : `${index.ticker} ${level}`;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function midQuote(bid?: number | null, ask?: number | null): number | null {
  if (bid == null || ask == null) return null;
  return (bid + ask) / 2;
}

/** Prefer book mid; fall back to last trade. Never invent a mid from last trade. */
export function displayPrice(
  market: Pick<Market, 'yes_bid' | 'yes_ask' | 'probability' | 'tape_mid_1m'>,
): {
  value: number | null;
  kind: 'mid' | 'tape' | 'last' | 'none';
} {
  const mid = midQuote(market.yes_bid, market.yes_ask);
  if (mid != null) return { value: mid, kind: 'mid' };
  if (market.tape_mid_1m != null) return { value: market.tape_mid_1m, kind: 'tape' };
  if (market.probability != null) return { value: market.probability, kind: 'last' };
  return { value: null, kind: 'none' };
}

export function summarizeSeries(points: Array<{ price: number }>): {
  open: number;
  close: number;
  high: number;
  low: number;
  change: number;
  changePct: number;
} | null {
  if (points.length === 0) return null;
  const prices = points.map((p) => p.price);
  const open = prices[0];
  const close = prices[prices.length - 1];
  return {
    open,
    close,
    high: Math.max(...prices),
    low: Math.min(...prices),
    change: close - open,
    changePct: open === 0 ? 0 : ((close - open) / open) * 100,
  };
}
