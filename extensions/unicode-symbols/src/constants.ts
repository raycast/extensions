import { raycastPreferences } from "./raycast-preferences";

const defaultSearchResultLimit = 100;
const maxSearchResultLimit = 1000;

const searchResultLimitFromPreferences = Number(raycastPreferences.searchResultLimitStr) || defaultSearchResultLimit;

export const searchResultLimit =
  searchResultLimitFromPreferences && searchResultLimitFromPreferences <= maxSearchResultLimit
    ? searchResultLimitFromPreferences
    : maxSearchResultLimit;
