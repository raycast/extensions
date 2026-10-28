import { LocalStorage } from "@raycast/api";
import { SortMode } from "../types";

const STORAGE_KEY = "sort-mode";
export const DEFAULT_SORT_MODE: SortMode = "name-asc";

export const SORT_OPTIONS: { value: SortMode; title: string }[] = [
  { value: "name-asc", title: "Name (A to Z)" },
  { value: "name-desc", title: "Name (Z to A)" },
  { value: "date-added-desc", title: "Date Added (Newest First)" },
  { value: "date-added-asc", title: "Date Added (Oldest First)" },
  { value: "date-modified-desc", title: "Date Modified (Newest First)" },
  { value: "date-modified-asc", title: "Date Modified (Oldest First)" },
  { value: "size-desc", title: "File Size (Largest First)" },
  { value: "size-asc", title: "File Size (Smallest First)" },
  { value: "recent", title: "Recently Used" },
  { value: "frequent", title: "Most Used" },
];

const VALID_SORT_MODES = new Set(SORT_OPTIONS.map((option) => option.value));

export async function loadSortMode(): Promise<SortMode> {
  const value = await LocalStorage.getItem<string>(STORAGE_KEY);
  return value && VALID_SORT_MODES.has(value as SortMode) ? (value as SortMode) : DEFAULT_SORT_MODE;
}

export async function saveSortMode(mode: SortMode): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, mode);
}
