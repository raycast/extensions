import { Detail } from "@raycast/api";
import { NoBraveBookmarksText } from "../constants";

export function NoBookmarks() {
  return <Detail markdown={NoBraveBookmarksText} />;
}
