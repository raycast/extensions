import os from "os";

import { List, ActionPanel, Action } from "@raycast/api";

const isMacOSVenturaOrLater = parseInt(os.release().split(".")[0]) >= 22;
const fullDiskAccessSettingsPath = isMacOSVenturaOrLater
  ? "System Settings -> Privacy & Security -> Full Disk Access"
  : "System Preferences -> Security & Privacy -> Privacy -> Full Disk Access";

export default function PermissionErrorScreen() {
  const actionTitle = "Open Full Disk Access Settings";
  const actionTarget = "x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles";
  const isMacOS = process.platform === "darwin";

  return (
    <List>
      <List.EmptyView
        icon={{
          source: {
            light: "https://raycast.com/uploads/extensions-utils-security-permissions-light.png",
            dark: "https://raycast.com/uploads/extensions-utils-security-permissions-dark.png",
          },
        }}
        title={isMacOS ? "Raycast needs Full Disk Access." : "Raycast cannot access browser bookmarks."}
        description={
          isMacOS
            ? `Enable Raycast under ${fullDiskAccessSettingsPath}, then quit and reopen Raycast.`
            : "Check that Raycast can read the selected browser's profile files."
        }
        actions={
          isMacOS ? (
            <ActionPanel>
              <Action.Open title={actionTitle} target={actionTarget} />
            </ActionPanel>
          ) : undefined
        }
      />
    </List>
  );
}
