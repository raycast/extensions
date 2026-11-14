import os from "os";

import { List, ActionPanel, Action } from "@raycast/api";

const isMacOSVenturaOrLater = parseInt(os.release().split(".")[0]) >= 22;
const preferencesString = isMacOSVenturaOrLater ? "Settings" : "Preferences";

export default function PermissionErrorScreen() {
  const actionTitle = isMacOSVenturaOrLater ? "Open System Settings -> Privacy" : "Open System Preferences -> Security";
  const actionTarget = "x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles";

  return (
    <List>
      <List.EmptyView
        icon={{
          source: {
            light: "https://raycast.com/uploads/extensions-utils-security-permissions-light.png",
            dark: "https://raycast.com/uploads/extensions-utils-security-permissions-dark.png",
          },
        }}
        title="Raycast needs full disk access."
        description={`This is required to get your bookmarks. Note that you can revert this access in ${preferencesString} whenever you want.`}
        actions={
          <ActionPanel>
            <Action.Open title={actionTitle} target={actionTarget} />
          </ActionPanel>
        }
      />
    </List>
  );
}
