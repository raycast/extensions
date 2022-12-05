import { Action, ActionPanel, Detail, Icon, openCommandPreferences } from "@raycast/api";
import { openNewChromeTab, openNewFirefoxTab, openNewSafariTab } from "../actions";
import { HistoryEntry } from "../interfaces";

export const HistoryItemAction = ({ entry: { title, url } }: { entry: HistoryEntry }) => (
  <ActionPanel title={title}>
    <Action.OpenInBrowser title="Open in Default Browser" url={url} />
    <ActionPanel.Section title={"Copy"}>
      <Action.CopyToClipboard title="Copy URL" content={url} shortcut={{ modifiers: ["cmd", "shift"], key: "c" }} />
    </ActionPanel.Section>
    <ActionPanel.Section title={"Open In"}>
      <ActionPanel.Item title={"Open in Chrome"} icon={"chrome-logo.png"} onAction={() => openNewChromeTab(url)} />
      <ActionPanel.Item title={"Open in Firefox"} icon={"firefox-logo.png"} onAction={() => openNewFirefoxTab(url)} />
      <ActionPanel.Item title={"Open in Safari"} icon={"safari-logo.png"} onAction={() => openNewSafariTab(url)} />
    </ActionPanel.Section>
  </ActionPanel>
);

export function ActionOpenPreferences() {
  return (
    <ActionPanel.Section>
      <Action
        icon={Icon.Gear}
        title="Open Command Preferences"
        shortcut={{ modifiers: ["cmd"], key: "," }}
        onAction={openCommandPreferences}
      />
    </ActionPanel.Section>
  );
}

const permissionErrorMarkdown = `## Raycast needs full disk access in order to display your Safari bookmarks.

![Full Disk Access Preferences Pane](https://i.imgur.com/3SAUwrx.png)

1. Open the **Security & Privacy** Preferences pane and select the **Privacy** tab
2. Select **Full Disk Access** from the list of services
3. Click the lock icon in the bottom left corner to unlock the interface
4. Enter your macOS administrator password
5. Drag and Drop the icon for the **Raycast** application into the list as seen above`;

export const PermissionErrorDetail = () => (
  <Detail
    markdown={permissionErrorMarkdown}
    actions={
      <ActionPanel>
        <Action.Open
          title="Open System Preferences"
          icon={Icon.Gear}
          target="x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles"
        />
      </ActionPanel>
    }
  />
);
