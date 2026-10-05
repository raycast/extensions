import { Action, ActionPanel, Detail } from "@raycast/api";

const APP_STORE_URL = "https://apps.apple.com/app/id6757330954";

/** Shown when the snipper-mcp helper can't be found (SnipperApp not installed). */
export function AppNotInstalled() {
  const markdown = [
    "# SnipperApp isn't installed",
    "",
    "This command needs **SnipperApp 3** to read your local snippet library.",
    "",
    "- Install it from the Mac App Store, then run this command again.",
    "- You can still use **Search Hub** and **Browse Trending** without the app.",
    "",
    "_If the app is installed, set the helper path in this extension's preferences._",
  ].join("\n");

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Get SnipperApp" url={APP_STORE_URL} />
        </ActionPanel>
      }
    />
  );
}
