import { Detail } from "@raycast/api";
import { NoBookmarksText } from "../constants";

export function NoBookmarks() {
  return <Detail markdown={NoBookmarksText} />;
}
