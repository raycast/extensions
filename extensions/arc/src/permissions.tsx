// Permission

import { Detail, ActionPanel, Action, Icon } from "@raycast/api";

export class PermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PermissionError";
  }
}

export const isPermissionError = (error: unknown) => {
  return error instanceof Error && error.name === "PermissionError";
};

export function PermissionErrorView() {
  const markdown = `## Raycast needs full disk access in order to display your Safari bookmarks.

  ![Full Disk Access Preferences Pane](https://i.imgur.com/3SAUwrx.png)
  
  1. Open the **Security & Privacy** Preferences pane and select the **Privacy** tab
  2. Select **Full Disk Access** from the list of services
  3. Click the lock icon in the bottom left corner to unlock the interface
  4. Enter your macOS administrator password
  5. Drag and Drop the icon for the **Raycast** application into the list as seen above`;

  return (
    <Detail
      markdown={markdown}
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
}
