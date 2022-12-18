import { Detail } from "@raycast/api";
import { DownloadText } from "../../constants";

export function NotInstalled() {
  return <Detail markdown={DownloadText} />;
}
