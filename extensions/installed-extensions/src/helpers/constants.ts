import { Option } from "../types";

export const extensionTypes: Option[] = [
  { id: "all", name: "All" },
  { id: "store", name: "Store" },
  { id: "local", name: "Local" },
];

export const RECENTLY_UPDATED_WINDOW_MS = 60 * 60 * 1000;
export const LOCAL_EXTENSION_UUID_PATTERN = /[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}/i;

export const LIST_PAGE_SIZE = 25;
export const STAT_CONCURRENCY = 40;
export const PARSE_CONCURRENCY = 12;
