export type Entry = {
  name: string;
  path: string;
  /** Canonical target used for stored history when `path` is a symlink. */
  storagePath?: string;
  isDirectory: boolean;
  isSymlink: boolean;
  size: number;
  mtimeMs: number;
  birthtimeMs: number;
  /** kMDItemUseCount, filled asynchronously when available. */
  useCount?: number;
  /** kMDItemLastUsedDate, filled in asynchronously. */
  lastUsedMs?: number;
  /** Filesystem identity used to deduplicate aliases. */
  dev?: number;
  ino?: number;
};

export type Visit = {
  /** Lifetime open count. Display only — the ranking uses `ems`. */
  count: number;
  /** Wall-clock ms of the last open. Display only. */
  lastVisit: number;
  /** Exponential moving sum of opens on the event clock. */
  ems: number;
  /** Event-clock tick at which `ems` was last brought up to date. */
  tick: number;
};

export type Visits = Record<string, Visit>;

/** Visit records and the event clock, which advances once per open. */
export type VisitLog = {
  tick: number;
  items: Visits;
};

export type SortMode = "usage" | "modified" | "created" | "name" | "size";

export const SORT_MODES: { value: SortMode; title: string }[] = [
  { value: "usage", title: "Usage" },
  { value: "modified", title: "Date Modified" },
  { value: "created", title: "Date Created" },
  { value: "name", title: "Name" },
  { value: "size", title: "Size" },
];
