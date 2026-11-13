import { Action, ActionPanel, Detail, Icon, LaunchType, launchCommand, openExtensionPreferences } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

export function NoConnection() {
  const markdown = [
    "# No connection configured",
    "",
    "Add a MySQL connection with the **Manage Connections** command,",
    "or fill in the extension preferences for a single fallback connection.",
  ].join("\n");

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Manage Connections"
            icon={Icon.Plug}
            onAction={async () => {
              try {
                await launchCommand({ name: "manage-connections", type: LaunchType.UserInitiated });
              } catch (error) {
                await showFailureToast(error, { title: "Could not open Manage Connections" });
              }
            }}
          />
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
