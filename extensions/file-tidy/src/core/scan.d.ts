import type { SubCategoryRule } from "./config.js";

export interface SourceFile {
  path: string;
  name: string;
  ext: string;
  size: number;
  birthtime: Date;
  mtime: Date;
}
export interface CompiledSubRule {
  name: string;
  test: (file: SourceFile) => boolean;
}
export function scanSource(
  sourceDir: string,
  opts?: { recursive?: boolean; excludeTopDirs?: Set<string>; includeJunk?: boolean },
): SourceFile[];
export function scanDest(destDir: string, opts?: { onlyDirs?: Set<string>; skipDirs?: Set<string> }): SourceFile[];
export function classify(file: SourceFile, extIndex: Map<string, string>, fallbackCategory: string): string;
export function buildSubIndex(subCategories?: Record<string, SubCategoryRule[]>): Map<string, CompiledSubRule[]>;
export function subClassify(
  file: SourceFile,
  category: string,
  subIndex: Map<string, CompiledSubRule[]>,
): string | null;
