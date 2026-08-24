// What `present.mjs` returns.
//
// The implementation stays plain ESM so `node --test` can run it — the whole
// reason the non-React half of this extension lives there. This declares its
// shapes so the components get real types instead of `any`, which is not a
// second implementation of anything: it is the same functions, described.

import type { Cause, Finding, Level, Meta, Plan } from "./engine";

export interface Preferences {
  limit?: string;
  speed?: "gentle" | "normal" | "fast";
  checkExternal?: boolean;
}

export interface CrawlOptions {
  limit: number;
  concurrency: number;
  checkExternal: boolean;
}

/** A row in a preview: a fact, and the line under it. */
export interface Row {
  id: string;
  title: string;
  subtitle: string;
  tone: "error" | "warn" | "ok" | "plain";
}

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
  path: string;
  when: Date;
}

/** A report as read back off disk. `causes` may be absent in one written
 *  before the grouping travelled with it, which is why the caller recomputes. */
export interface StoredReport {
  meta?: Meta;
  findings?: Finding[];
  causes?: Cause[];
}

export const SPEEDS: Record<"gentle" | "normal" | "fast", number>;

export function crawlOptions(preferences?: Preferences): CrawlOptions;
export function normalise(text: string | undefined | null): string | null;
export function previewRows(plan: Plan | null): Row[];
export function causeRows(report: { causes?: Cause[] } | null): CauseRow[];
export function summaryLine(report: { meta?: Meta; findings?: Finding[]; causes?: Cause[] } | null): string;

export function libraryRoot(root?: string): string;
export function keptReports(root?: string): KeptReport[];
export function readReport(path: string): StoredReport | null;
export function appIsInstalled(): boolean;
export function reportFiles(root?: string): string[];
