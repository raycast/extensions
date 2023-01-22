import { Action, ActionPanel, Detail, environment, Icon } from "@raycast/api";
import path from "path";
import fileUrl from "file-url";

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

// @TODO: This screen should be handled by Raycast itself (https://github.com/raycast/extensions/issues/101)
const permissionErrorMarkdown = `## Raycast needs automation access to iTerm.

1. Open **System Settings**
1. Open the **Privacy & Security** Preferences pane 
1. Then select the **Automation** tab
1. Expand **Raycast** from the list of applications
1. Ensure the **iTerm**  toggle is enabled as shown in the image below
1. When prompted enter your password

![Full Disk Access Preferences Pane](${fileUrl(path.join(environment.assetsPath, "permission-raycast-automation.png"))})
`;

export const isPermissionError = (reason: string) =>
  reason.indexOf(`Not authorized to send Apple events to iTerm.`) !== -1;

export const PermissionErrorScreen = () => (
  <Detail markdown={permissionErrorMarkdown} navigationTitle={"Permission Issue with Raycast"} actions={<Actions />} />
);

export const GeneralErrorScreen = ({ reason }: { reason: string }) => <Detail markdown={`Unknown error: ${reason}`} />;
