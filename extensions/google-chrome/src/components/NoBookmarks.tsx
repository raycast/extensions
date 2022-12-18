import { Detail } from "@raycast/api";
import { NoChromeBookmarksText } from "../constants";

export function NoBookmarks() {
  return <Detail markdown={NoChromeBookmarksText} />;
}
