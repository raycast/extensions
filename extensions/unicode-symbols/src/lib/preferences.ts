import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  searchResultLimitStr: string;
  viewType: "list" | "grid";
}

const raycastPreferences: Preferences = getPreferenceValues();

const defaultSearchResultLimit = 100;
const maxSearchResultLimit = 1000;

const searchResultLimitFromPreferences = Number(raycastPreferences.searchResultLimitStr) || defaultSearchResultLimit;

export const searchResultLimit =
  searchResultLimitFromPreferences && searchResultLimitFromPreferences <= maxSearchResultLimit
    ? searchResultLimitFromPreferences
    : maxSearchResultLimit;

export const viewType = String(raycastPreferences.viewType) || "list";
