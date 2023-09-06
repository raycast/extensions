import { Detail } from "@raycast/api";
import { getNoCollectionsText } from "../../utils/messageUtils";

export function NoCollectionsError() {
  return <Detail markdown={getNoCollectionsText()} />;
}
