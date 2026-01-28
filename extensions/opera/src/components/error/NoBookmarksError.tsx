import { Detail } from "@raycast/api";
import { NoBookmarksText } from "../../constants";

export function NoBookmarksError() {
  return <Detail markdown={NoBookmarksText} />;
}
