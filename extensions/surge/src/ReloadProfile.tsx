import { Action, ActionPanel, Icon, List, Toast, popToRoot, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import api from "./api.js";

export default function ReloadProfile({ xKey, port }: { xKey: string; port: string }) {
  // Reload profile immediately.
  async function handleAction() {
    try {
      await api(xKey, port).reloadProfile();
      await showToast(Toast.Style.Success, "Success", "Profile has been reloaded.");
      popToRoot({ clearSearchBar: true });
    } catch (error) {
      await showFailureToast(error, {
        title: "Failed",
        message: "Please check your X-Key, port and function availability",
      });
    }
  }

  return (
    <List.Item
      title="Reload Profile from File"
      icon={Icon.Dot}
      actions={
        <ActionPanel title="Reload">
          <ActionPanel.Submenu title="Reload Profile">
            <Action title="Yes" onAction={() => handleAction()} />
            <Action title="No" />
          </ActionPanel.Submenu>
        </ActionPanel>
      }
    />
  );
}
