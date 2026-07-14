import type { PlanEntry } from "./plan.js";

export function executePlan(
  entries: PlanEntry[],
  opts: { destDir: string; sourceDir: string },
): { moved: PlanEntry[]; manifestPath: string };
