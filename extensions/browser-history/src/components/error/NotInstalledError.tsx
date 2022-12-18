import { Detail } from "@raycast/api";
import { SupportedBrowsers } from "../../interfaces";
import { DOWNLOAD_TEXT } from "../../constants";

export function NotInstalledError({ browser }: { browser: SupportedBrowsers }) {
  return <Detail markdown={DOWNLOAD_TEXT[browser]} />;
}
