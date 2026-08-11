import type { TidyConfig } from "./config.js";
import type { PlanEntry } from "./plan.js";
import type { SourceFile } from "./scan.js";

export type Phase = "scanning" | "dedup" | "health" | "similar" | "perceptual" | "planning";

export interface AnalyzeCounts {
  archive: number;
  duplicate: number;
  review: number;
  similar: number;
  perceptual: number;
}

export function analyze(input: {
  sourceDir: string;
  destDir: string;
  config: TidyConfig;
  recursive?: boolean;
  inPlace?: boolean;
  onPhase?: (phase: Phase, info?: { files?: number; done?: number }) => void;
}): Promise<{
  entries: PlanEntry[];
  sourceFiles: SourceFile[];
  counts: AnalyzeCounts;
}>;
