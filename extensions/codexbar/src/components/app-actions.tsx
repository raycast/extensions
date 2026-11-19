import { Action, Icon, open, showToast, Toast } from "@raycast/api";
import { existsSync } from "fs";
import { APP_CANDIDATES, APP_HOMEPAGE } from "../lib/constants";

async function openCodexBar() {
  const app = APP_CANDIDATES.find((candidate) => existsSync(candidate));
  if (!app) {
    await showToast({ style: Toast.Style.Failure, title: "CodexBar is not installed" });
    return;
  }
  await open(app);
}

export function OpenCodexBarAction() {
  return <Action title="Open CodexBar" icon={Icon.AppWindow} onAction={openCodexBar} />;
}

export function DownloadCodexBarAction() {
  return <Action.OpenInBrowser title="Get CodexBar" url={APP_HOMEPAGE} />;
}
