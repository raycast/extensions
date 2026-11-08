import { Action, Icon, open } from "@raycast/api";
import { APP_HOMEPAGE, APP_PATH } from "../lib/constants";

export function OpenCodexBarAction() {
  return <Action title="Open CodexBar" icon={Icon.AppWindow} onAction={() => open(APP_PATH)} />;
}

export function DownloadCodexBarAction() {
  return <Action.OpenInBrowser title="Get CodexBar" url={APP_HOMEPAGE} />;
}
