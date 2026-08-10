import { ActionPanel, Detail } from "@raycast/api";
import OpenFullDiskAccessPreferencePaneAction from "./OpenFullDiskAccessPreferencePane";

// @TODO: This screen should be handled by Raycast itself (https://github.com/raycast/extensions/issues/101)
const permissionErrorMarkdown = `## Raycast needs full disk access in order to display your Safari bookmarks.

![Full Disk Access Preferences Pane](https://i.imgur.com/3SAUwrx.png)

1. Open the **Security & Privacy** Preferences pane and select the **Privacy** tab
2. Select **Full Disk Access** from the list of services
3. Click the lock icon in the bottom left corner to unlock the interface
4. Enter your macOS administrator password
5. Drag and Drop the icon for the **Raycast** application into the list as seen above`;

const Actions = () => (
  <ActionPanel>
    <OpenFullDiskAccessPreferencePaneAction />
  </ActionPanel>
);

export default function PermissionError() {
  return <Detail markdown={permissionErrorMarkdown} actions={<Actions />} />;
}
