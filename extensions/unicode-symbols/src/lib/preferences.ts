import { getPreferenceValues } from "@raycast/api";

const raycastPreferences = getPreferenceValues<Preferences>();

const defaultSearchResultLimit = 100;
const maxSearchResultLimit = 1000;

const searchResultLimitFromPreferences = Number(raycastPreferences.searchResultLimitStr) || defaultSearchResultLimit;

export const searchResultLimit =
  searchResultLimitFromPreferences && searchResultLimitFromPreferences <= maxSearchResultLimit
    ? searchResultLimitFromPreferences
    : maxSearchResultLimit;

export const viewType = String(raycastPreferences.viewType) || "list";

export const gridColumnNumber = (): number => {
  const prefSize = String(raycastPreferences.gridItemSize) || "medium";
  switch (prefSize) {
    case "small":
      return 8;
    case "large":
      return 3;
    default:
      return 5;
  }
};

export const dataSetName = raycastPreferences.dataSet === "full" && viewType === "grid" ? "full-dataset" : "dataset";

export const primaryAction: "copy" | "paste" = raycastPreferences.primaryAction || "paste";
