import { Detail } from "@raycast/api";
import { NoVivaldiBookmarksText } from "../constants";

export function NoBookmarks() {
  return <Detail markdown={NoVivaldiBookmarksText} />;
}
