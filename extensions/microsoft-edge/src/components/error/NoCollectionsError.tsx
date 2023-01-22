import { Detail } from "@raycast/api";
import { NoBookmarksText, NoCollectionsText } from "../../constants";

export function NoCollectionsError() {
  return <Detail markdown={NoCollectionsText} />;
}
