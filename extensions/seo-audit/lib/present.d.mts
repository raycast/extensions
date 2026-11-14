// What `present.mjs` returns.
//
// The implementation stays plain ESM so `node --test` can run it — the whole
// reason the non-React half of this extension lives there. This declares its
// shapes so the components get real types instead of `any`, which is not a
// second implementation of anything: it is the same functions, described.

import type { Cause, Finding, Level, Meta, Plan, Score } from "./engine";

/**
 * The preferences, as the manifest declares them.
 *
 * `ExtensionPreferences` is generated from `package.json` by the Raycast build,
 * so this cannot drift from it. It was hand-written once and listed three of
 * the thirteen preferences `crawlOptions()` actually reads — the other ten were
 * invisible to every caller, which is the exact failure a copied type produces:
 * not a wrong answer, a quietly incomplete one.
 */
export type Preferences = ExtensionPreferences;

export interface CrawlOptions {
  limit: number;
  concurrency: number;
  checkExternal: boolean;
  hosts: boolean;
}

/** A row in a preview: a fact, and the line under it. */
export interface Row {
  id: string;
  title: string;
  subtitle: string;
  tone: "error" | "warn" | "ok" | "plain";
  /** The flag that would let a skipped check actually run, when the engine says
   *  there is one. Absent for a skip that is a fact about the site rather than
   *  a choice about the crawl. */
  enabledBy?: string;
}

export function hostRows(meta: unknown, findings?: unknown[]): Row[];
export function optionsForFlag(flag: string): Record<string, unknown> | null;
/** The most pages a run can crawl inside a Raycast command before its worker
 *  runs out of heap. */
export const MAX_PAGES: number;
export function hostLine(row: unknown): string;

/** A row in a report — one thing to change, and the pages it is on. */
export interface CauseRow {
  id: string;
  title: string;
  subtitle: string;
  tone: Level;
  area: string;
  pages: string[];
  checkId: string;
}

/** A run the macOS app kept, plus where it is and when it happened. */
export interface KeptReport {
  id: string;
  host: string;
  site: string;
  finishedAt: string;
  pages: number;
  findings: number;
  causes: number;
  errors: number;
  warnings: number;
  /** Present once the app that wrote the index knew how to score a run. */
  score?: number;
  path: string;
  when: Date;
}

/** A report as read back off disk. `causes` may be absent in one written
 *  before the grouping travelled with it, which is why the caller recomputes. */
export interface StoredReport {
  meta?: Meta;
  findings?: Finding[];
  causes?: Cause[];
  score?: Score;
}

export const SPEEDS: Record<"gentle" | "normal" | "fast", number>;

export function crawlOptions(preferences?: Preferences): CrawlOptions;
export function normalise(text: string | undefined | null): string | null;
export function previewRows(plan: Plan | null): Row[];
export function causeRows(report: { causes?: Cause[] } | null): CauseRow[];
export function summaryLine(report: { meta?: Meta; findings?: Finding[]; causes?: Cause[] } | null): string;

export function scoreTag(score: Score | null | undefined): string | null;
export function scoreLine(score: Score | null | undefined): string;
export function gainFor(
  cause: { checkId?: string; id?: string; pages?: string[] },
  score: Score | null | undefined,
): number | null;
export function passedRows(score: Score | null | undefined): Row[];
export function skippedRows(score: Score | null | undefined): Row[];

export function libraryRoot(root?: string): string;
export function keptReports(root?: string): KeptReport[];
export function readReport(path: string): StoredReport | null;
export function appIsInstalled(): boolean;
export function reportFiles(root?: string): string[];
