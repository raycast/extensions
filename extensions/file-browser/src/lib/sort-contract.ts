import type { SortMode } from "./types";

/**
 * Canonical metadata for the persisted sort preference strings.
 *
 * Keep this table in the exact manifest order from `package.json` and never
 * rename the `id` values. Raycast persists the raw string, so changing an ID
 * would invalidate saved user preferences.
 */
export type SortMetadataSource =
  | "name"
  | "kind"
  | "lastOpened"
  | "addedDate"
  | "modifiedDate"
  | "createdDate"
  | "size"
  | "tags";

/**
 * Missing-value policy used by the sort contract.
 *
 * We currently only support "after" so missing metadata never outranks a
 * populated value.
 */
export type MissingValuePolicy = "after";

/**
 * Secondary tie-breaker used when the primary sort key is equal.
 */
export type SortTieBreaker = "none" | "nameAsc";

export type SortContractEntry = {
  id: SortMode;
  label: string;
  ascending: boolean;
  metadataSource: SortMetadataSource;
  missingValuePolicy: MissingValuePolicy;
  tieBreaker: SortTieBreaker;
};

/**
 * Stable, manifest-ordered sort contract.
 *
 * Contract constraints:
 * - IDs must stay exactly as persisted in Raycast preferences.
 * - The order must match the manifest dropdown order.
 * - Neutral date sorts use `nameAsc` as the tie-breaker.
 */
export const SORT_CONTRACT = [
  {
    id: "name-asc",
    label: "Name / △",
    ascending: true,
    metadataSource: "name",
    missingValuePolicy: "after",
    tieBreaker: "none",
  },
  {
    id: "kind-asc",
    label: "Kind / △",
    ascending: true,
    metadataSource: "kind",
    missingValuePolicy: "after",
    tieBreaker: "none",
  },
  {
    id: "date-last-opened-asc",
    label: "Date Last Opened / ▽",
    ascending: false,
    metadataSource: "lastOpened",
    missingValuePolicy: "after",
    tieBreaker: "nameAsc",
  },
  {
    id: "date-added-desc",
    label: "Date Added / ▽",
    ascending: false,
    metadataSource: "addedDate",
    missingValuePolicy: "after",
    tieBreaker: "nameAsc",
  },
  {
    id: "date-modified-asc",
    label: "Date Modified / ▽",
    ascending: false,
    metadataSource: "modifiedDate",
    missingValuePolicy: "after",
    tieBreaker: "nameAsc",
  },
  {
    id: "date-created-asc",
    label: "Date Created / △",
    ascending: true,
    metadataSource: "createdDate",
    missingValuePolicy: "after",
    tieBreaker: "none",
  },
  {
    id: "size-asc",
    label: "Size / △",
    ascending: true,
    metadataSource: "size",
    missingValuePolicy: "after",
    tieBreaker: "none",
  },
  {
    id: "tags-asc",
    label: "Tags / △",
    ascending: true,
    metadataSource: "tags",
    missingValuePolicy: "after",
    tieBreaker: "none",
  },
] as const satisfies readonly SortContractEntry[];

const SORT_CONTRACT_BY_ID: Record<SortMode, SortContractEntry> = Object.fromEntries(
  SORT_CONTRACT.map((entry) => [entry.id, entry]),
) as Record<SortMode, SortContractEntry>;

/** Returns the canonical contract entry for a persisted sort ID. */
export function getSortContractEntry(sortMode: SortMode): SortContractEntry {
  return SORT_CONTRACT_BY_ID[sortMode];
}

/** Returns true for the date sorts that intentionally share the neutral contract. */
export function isNeutralDateSort(sortMode: SortMode): boolean {
  return (
    sortMode === "date-last-opened-asc" ||
    sortMode === "date-added-desc" ||
    sortMode === "date-modified-asc" ||
    sortMode === "date-created-asc"
  );
}

/** Returns the display label for a persisted sort ID. */
export function getSortLabel(sortMode: SortMode): string {
  return getSortContractEntry(sortMode).label;
}

/** Returns the full manifest-ordered sort contract table. */
export function getSortOptions(): readonly SortContractEntry[] {
  return SORT_CONTRACT;
}
