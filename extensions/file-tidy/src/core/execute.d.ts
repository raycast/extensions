import type { PlanEntry } from "./plan.js";

export function executePlan(
  entries: PlanEntry[],
  opts: { destDir: string; sourceDir: string; formatDupBlock?: (dups: PlanEntry[]) => string },
): { moved: PlanEntry[]; manifestPath: string };
