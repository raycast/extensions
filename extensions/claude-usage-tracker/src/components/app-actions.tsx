import { Action, Icon, open, showToast, Toast } from "@raycast/api";
import { APP_HOMEPAGE } from "../lib/constants";
import { findApp } from "../lib/store";

async function openClaudeUsage() {
  const app = findApp();
  if (!app) {
    await showToast({ style: Toast.Style.Failure, title: "Claude Usage is not installed" });
    return;
  }
  await open(app);
}

export function OpenClaudeUsageAction() {
  return <Action title="Open Claude Usage" icon={Icon.AppWindow} onAction={openClaudeUsage} />;
}

export function DownloadClaudeUsageAction() {
  return <Action.OpenInBrowser title="Get Claude Usage" url={APP_HOMEPAGE} />;
}
