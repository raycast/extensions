import { Detail } from "@raycast/api";
import { NoCollectionsText } from "../../constants";

export function NoCollectionsError() {
  return <Detail markdown={NoCollectionsText} />;
}
