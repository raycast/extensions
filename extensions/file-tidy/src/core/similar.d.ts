import type { SourceFile } from "./scan.js";

export interface SimilarInfo {
  reason: "versioned" | "normalized-name" | "same-stem";
  best: boolean;
  peers: string[];
}
export function findSimilar(files: SourceFile[]): Map<string, SimilarInfo>;
export function pickLargest<T>(items: T[], sizeOf?: (item: T) => number): T;
