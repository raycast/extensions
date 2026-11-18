import { Action, ActionPanel, Icon, List } from "@raycast/api";

export function DeviceList({ deviceIds }: { deviceIds: string[] }) {
  return (
    <List>
      {deviceIds.map((id) => (
        <List.Item
          key={id}
          title={id}
          icon={Icon.Mobile}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Device Udid" content={id} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
