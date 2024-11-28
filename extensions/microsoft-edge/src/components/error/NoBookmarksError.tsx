import { Detail } from "@raycast/api";
import { getNoBookmarksText } from "../../utils/messageUtils";

export function NoBookmarksError() {
  return <Detail markdown={getNoBookmarksText()} />;
}
