import { Detail } from "@raycast/api";
import { DownloadText } from "../../constants";

export function NotInstalledError() {
  return <Detail markdown={DownloadText} />;
}
