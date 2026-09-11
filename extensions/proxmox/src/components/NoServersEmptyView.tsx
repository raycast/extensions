import { Action, ActionPanel, Icon, List, openExtensionPreferences } from "@raycast/api";
import { ManageServers } from "@/screens/ManageServers";

export const NoServersEmptyView = () => {
  return (
    <List.EmptyView
      icon={Icon.Plug}
      title="No Proxmox Servers Configured"
      description="Add servers with the Manage Servers command, or set one in the extension preferences."
      actions={
        <ActionPanel>
          <Action.Push title="Manage Servers" icon={Icon.Gear} target={<ManageServers />} />
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
};
