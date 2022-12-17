import { Detail } from "@raycast/api";
import { DownloadOperaText } from "../constants";

export function NotInstalled() {
  return <Detail markdown={DownloadOperaText} />;
}
