import { raycastPreferences } from "./raycast-preferences";

const defaultSearchResultLimit = 100;

export const searchResultLimit = Number(raycastPreferences.searchResultLimitStr) || defaultSearchResultLimit;
