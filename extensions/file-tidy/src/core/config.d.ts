export type Granularity = "month" | "year" | "none";

export interface SubCategoryRule {
  name: string;
  match?: string[];
  exts?: string[];
}

export interface TidyConfig {
  dest: string | null;
  categories: Record<string, string[]>;
  fallbackCategory: string;
  folderPrefix: string;
  granularity: Record<string, Granularity>;
  subCategories: Record<string, SubCategoryRule[]>;
  /** Per-pass switches, or `false` to turn every detection pass off (current and future). */
  detect: { similar: boolean; health: boolean; perceptual: boolean } | false;
  perceptualThreshold: number;
  _created?: boolean;
  /** Default categories missing from the user's config file (added in a later version). */
  _staleCategories?: string[];
  _path: string;
}
export const DUPLICATES_DIR: string;
export const REVIEW_DIR: string;
export const TIDY_DIR: string;
export function loadConfig(): TidyConfig;
export function tidyPath(destDir: string, ...sub: string[]): string;
export function buildExtIndex(config: TidyConfig): Map<string, string>;
export function buildFolderNamer(destDir: string, config: TidyConfig): (base: string) => string;
export function organizedDirNames(config: TidyConfig): Set<string>;
export function quarantineDirNames(config: TidyConfig): Set<string>;
export function canonicalPath(p: string): string;
export function isInsideDir(parent: string, child: string): boolean;
