import type { TidyConfig } from "./config.js";
import type { HashCacheEntry } from "./phash.js";
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

/**
 * The perceptual-hash cache state gathered during analysis, for executePlan to
 * persist once the run has actually happened — analyze() never writes to disk.
 */
export interface HashCacheState {
  cache: Map<string, HashCacheEntry>;
  images: SourceFile[];
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
  hashCache: HashCacheState | null;
}>;
