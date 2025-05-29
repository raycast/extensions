import { getPreferenceValues, Icon } from "@raycast/api";
import { SearchResult } from "./types";

export const getIcon = (item: SearchResult) => {
  if (item.isNavigation) {
    return Icon.Link;
  } else if (item.isApiResult) {
    return Icon.Globe;
  } else if (item.isFastGPT) {
    return Icon.QuestionMark;
  } else if (item.hasBang) {
    return Icon.Exclamationmark;
  } else {
    return Icon.MagnifyingGlass;
  }
};

export const apiEnabled = getPreferenceValues()["useApiForSearch"] && getPreferenceValues()["apiKey"].length > 0;
