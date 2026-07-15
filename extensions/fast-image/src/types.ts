export interface ImageFile {
  path: string;
  name: string;
  extension: string;
  size: number;
  mtimeMs: number;
  createdAtMs: number;
}

export type SortMode =
  | "name-asc"
  | "name-desc"
  | "date-added-desc"
  | "date-added-asc"
  | "date-modified-desc"
  | "date-modified-asc"
  | "size-desc"
  | "size-asc"
  | "recent"
  | "frequent";

export type AutoRefreshInterval = "never" | "hourly" | "daily" | "every-launch";

export interface UsageEntry {
  count: number;
  lastUsedAt: number;
}

export type UsageStats = Record<string, UsageEntry>;
