import { ActionPanel, Detail, Icon, Action, environment } from "@raycast/api";
import path from "path";
import fileUrl from "file-url";

export class PermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PermissionError";
  }
}

export const isPermissionError = (error: unknown) => {
  return error instanceof Error && error.name === "PermissionError";
};

// @TODO: This screen should be handled by Raycast itself (https://github.com/raycast/extensions/issues/101)
const permissionErrorMarkdown = `## Raycast needs full disk access in order to display your Microsoft OneNote notes.

![Full Disk Access Preferences Pane](${fileUrl(path.join(environment.assetsPath, "full-disk-access.png"))})

1. Open the **Security & Privacy** Preferences pane and select the **Privacy** tab
2. Select **Full Disk Access** from the list of services
3. Click the lock icon in the bottom left corner to unlock the interface
4. Enter your macOS administrator password
5. Drag and Drop the icon for the **Raycast** application into the list as seen above`;

const OpenFullDiskAccessPreferencePaneAction = () => (
  <Action.Open
    title="Open System Preferences"
    icon={Icon.Gear}
    target="x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles"
  />
);

const Actions = () => (
  <ActionPanel>
    <OpenFullDiskAccessPreferencePaneAction />
  </ActionPanel>
);

export const PermissionErrorScreen = () => <Detail markdown={permissionErrorMarkdown} actions={<Actions />} />;
