import { Detail } from "@raycast/api";
import { getNoHistoryText } from "../../utils/messageUtils";

export function NoHistoryError() {
  return <Detail markdown={getNoHistoryText()} />;
}
