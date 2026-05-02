import type { SortMode } from "$lib/types";
import type { ContentsViewMode } from "./types";
import { getSortLabel } from "$lib/sort-contract";

const viewOptions: Record<ContentsViewMode, string> = {
  list: "List",
  grid: "Grid",
};

export const SUMMARY_VALUE = "summary" as const;

export function buildSummaryLabel(view: ContentsViewMode, sort: SortMode): string {
  const viewLabel = `􀦍 ${viewOptions[view]}`;
  const sortLabel = `􀵬 ${getSortLabel(sort)}`;
  return `${viewLabel} • ${sortLabel}`;
}

export type DropdownChange =
  | { type: "view"; value: ContentsViewMode }
  | { type: "sort"; value: SortMode }
  | { type: "summary" };

export function parseDropdownChange(newValue: string): DropdownChange {
  if (newValue === SUMMARY_VALUE) {
    return { type: "summary" };
  }
  if (newValue.startsWith("view:")) {
    return { type: "view", value: newValue.slice("view:".length) as ContentsViewMode };
  }
  if (newValue.startsWith("sort:")) {
    return { type: "sort", value: newValue.slice("sort:".length) as SortMode };
  }
  return { type: "summary" };
}

export function viewValue(mode: ContentsViewMode): string {
  return `view:${mode}`;
}

export function sortValue(mode: SortMode): string {
  return `sort:${mode}`;
}

// Raycast's Dropdown only updates the displayed label when `value` changes between renders.
// Embedding view + sort + nonce forces the value to change after every selection.
export function buildDisplayValue(view: ContentsViewMode, sort: SortMode, nonce: number): string {
  return `${SUMMARY_VALUE}:${view}:${sort}:${nonce}`;
}
