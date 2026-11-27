/** Types for lite.js (the public feed reader shared by the Telegram bot, the Sheets add-on and the extension). */
export interface FeedQuote {
  dataset: string; source: string; instrument: string; buy: number | null; sell: number | null; mid?: number | null;
  observedAt: string; changedAt: string; stale?: boolean; provider?: string; unit?: number; attrs?: Record<string, unknown>;
}
export interface FeedSnapshot { generatedAt: string; quotes: FeedQuote[] }
export interface FeedCatalog { banks: { id: string; name: { en: string; ar: string } }[] }
export interface Side { rate: number; banks: string[] }
export interface Board {
  currency: string; unit: number;
  cbe: { buy: number | null; sell: number | null; at: string } | null;
  best: { sell: Side; buy: Side } | null;
  banks: { bank: string; buy: number; sell: number; behind: boolean; changedAt: string }[];
  updatedAt: string;
}
export interface Metal { instrument: string; buy: number | null; sell: number | null; changedAt: string; behind: boolean }
export type Basis = 'cbe' | 'buy' | 'sell';

export const GENEH_FEED: { prod: string; dev: string };
/** Geneh's social profiles, a copy of GENEH_SOCIAL in packages/contracts. */
export const GENEH_SOCIAL: { id: string; label: string; handle: string; url: string }[];
export const GENEH_CCY: string[];
export const GENEH_CCY_NAMES: Record<string, [string, string]>;
export const GENEH_GOLD: Record<string, string>;
export const GENEH_SILVER: Record<string, string>;
export function genehCurrency(text: unknown): string | null;
export function genehGoldId(text?: unknown): string | null;
export function genehSilverId(text?: unknown): string | null;
export function genehBehind(q: FeedQuote, at: number): boolean;
export function genehBoard(snapshot: FeedSnapshot | null | undefined, ccy: unknown): Board | null;
export function genehMetal(snapshot: FeedSnapshot | null | undefined, kind: 'gold' | 'silver', which?: unknown): Metal | null;
export function genehSpot(snapshot: FeedSnapshot | null | undefined, kind: 'gold' | 'silver'): number | null;
export function genehEgpPer(snapshot: FeedSnapshot, ccy: unknown, basis?: Basis): number | null;
export function genehConvert(snapshot: FeedSnapshot, amount: unknown, from: unknown, to?: unknown, basis?: Basis): number | null;
export function genehBankNames(catalog: FeedCatalog | null | undefined): Record<string, { en: string; ar: string }>;
export function genehFmt(n: number | null | undefined, lang?: 'en' | 'ar'): string;
export function genehNormalizeNumber(num: string): string;
export function genehFindAmount(text: unknown): { amount: number; currency: string } | null;
export function genehFindAmounts(text: unknown): { index: number; length: number; amount: number; currency: string }[];
