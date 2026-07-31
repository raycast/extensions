export interface TidyConfig {
  categories: Record<string, string[]>;
  fallbackCategory: string;
  _created?: boolean;
  _path: string;
}
export function loadConfig(): TidyConfig;
export function buildExtIndex(config: TidyConfig): Map<string, string>;
export function canonicalPath(p: string): string;
export function isInsideDir(parent: string, child: string): boolean;
