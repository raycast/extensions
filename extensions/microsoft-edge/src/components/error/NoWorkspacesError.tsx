import { Detail } from "@raycast/api";
import { getNoWorkspacesText } from "../../utils/messageUtils";

export function NoWorkspacesError() {
  return <Detail markdown={getNoWorkspacesText()} />;
}
