import { Detail } from "@raycast/api";
import { DownloadIridiumText } from "../constants";

export function NotInstalled() {
  return <Detail markdown={DownloadIridiumText} />;
}
