import type { PlanEntry } from "./plan.js";

export function executePlan(
  entries: PlanEntry[],
  opts: {
    destDir: string;
    sourceDir: string;
    formatDupBlock?: (dups: PlanEntry[]) => string;
    formatSimilarBlock?: (flagged: PlanEntry[], opts: { destDir: string }) => string;
  },
): { moved: PlanEntry[]; manifestPath: string; similarReportPath: string | null };

export function relativeToDest(p: string, destDir: string): string;
