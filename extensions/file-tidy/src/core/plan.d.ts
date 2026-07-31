import type { SourceFile } from "./scan.js";
import type { DupInfo } from "./dedup.js";

export interface PlanEntry {
  from: string;
  to: string;
  name: string;
  action: "archive" | "duplicate";
  category?: string;
  yearMonth?: string;
  dateSource?: "exif" | "fs";
  size: number;
  keeperPath?: string;
  hash?: string;
}
export function buildPlan(input: {
  sourceFiles: SourceFile[];
  duplicates: Map<string, DupInfo>;
  destDir: string;
  extIndex: Map<string, string>;
  fallbackCategory: string;
}): Promise<PlanEntry[]>;
export function formatSize(bytes: number): string;
