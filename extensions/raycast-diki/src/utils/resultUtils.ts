import { Icon } from "@raycast/api";
import { SearchResult } from "./types";

export const getIcon = (item: SearchResult) => {
  if (item.isHistory) {
    return Icon.Clock;
  } else if (item.isNavigation) {
    return Icon.Link;
  } else {
    return Icon.MagnifyingGlass;
  }
};
