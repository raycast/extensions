import os from "os";

import { Action, ActionPanel, Icon, List } from "@raycast/api";

import SelectBrowsers from "./SelectBrowsers";

const isMacOSVenturaOrLater = parseInt(os.release().split(".")[0]) >= 22;
const fullDiskAccessSettingsPath = isMacOSVenturaOrLater
  ? "System Settings -> Privacy & Security -> Full Disk Access"
  : "System Preferences -> Security & Privacy -> Privacy -> Full Disk Access";

type PermissionErrorScreenProps = {
  browsers: string[];
  onSelectBrowsers: (browsers: string[]) => void;
};

export default function PermissionErrorScreen({ browsers, onSelectBrowsers }: PermissionErrorScreenProps) {
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
            ? `Enable Raycast under ${fullDiskAccessSettingsPath}, then quit and reopen Raycast. You can also use Select Browsers to disable the browser.`
            : "Check that Raycast can read the selected browser's profile files, or use Select Browsers to disable the browser."
        }
        actions={
          <ActionPanel>
            {isMacOS ? <Action.Open title={actionTitle} icon={Icon.Gear} target={actionTarget} /> : null}
            <Action.Push
              title="Select Browsers"
              icon={Icon.CheckCircle}
              target={<SelectBrowsers browsers={browsers} onSelect={onSelectBrowsers} />}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
