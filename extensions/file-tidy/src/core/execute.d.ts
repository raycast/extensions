import type { HashCacheState } from "./analyze.js";
import type { PlanEntry } from "./plan.js";

/**
 * A record that could not be appended after the run had already moved every
 * file. Never thrown — the files are archived either way.
 */
export interface ReportError extends Error {
  code: "REPORT_WRITE";
  report: "duplicates" | "similar";
  path: string;
}

export function executePlan(
  entries: PlanEntry[],
  opts: {
    destDir: string;
    sourceDir: string;
    hashCache?: HashCacheState | null;
    formatDupBlock?: (dups: PlanEntry[]) => string;
    formatSimilarBlock?: (flagged: PlanEntry[], opts: { destDir: string }) => string;
  },
): {
  moved: PlanEntry[];
  manifestPath: string;
  similarReportPath: string | null;
  reportErrors: ReportError[];
};

export function relativeToDest(p: string, destDir: string): string;
