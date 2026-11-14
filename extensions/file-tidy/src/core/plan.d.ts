import type { Granularity } from "./config.js";
import type { CompiledSubRule, SourceFile } from "./scan.js";
import type { DupInfo } from "./dedup.js";
import type { HealthIssue } from "./health.js";
import type { SimilarInfo } from "./similar.js";
import type { PerceptualInfo } from "./phash.js";

export interface PlanEntry {
  from: string;
  to: string;
  name: string;
  action: "archive" | "duplicate" | "review";
  category?: string;
  subCategory?: string | null;
  dateBucket?: string;
  dateSource?: "exif" | "fs" | "none";
  size: number;
  keeperPath?: string;
  hash?: string;
  issue?: "empty" | "corrupt" | "junk";
  issueDetail?: string;
  similar?: SimilarInfo;
  perceptual?: PerceptualInfo;
}
export function buildPlan(input: {
  sourceFiles: SourceFile[];
  duplicates: Map<string, DupInfo>;
  destDir: string;
  extIndex: Map<string, string>;
  fallbackCategory: string;
  folderName: (base: string) => string;
  granularity?: Record<string, Granularity>;
  subIndex?: Map<string, CompiledSubRule[]>;
  health?: Map<string, HealthIssue>;
  similar?: Map<string, SimilarInfo>;
  perceptual?: Map<string, PerceptualInfo>;
}): Promise<PlanEntry[]>;
export function firstFreeName(target: string, isFree: (candidate: string) => boolean): string;
export function bucketLabel(entry: PlanEntry, destDir: string): string;
export function formatSize(bytes: number): string;
