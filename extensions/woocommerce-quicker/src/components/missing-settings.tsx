import {
  Detail,
  ActionPanel,
  Action,
  launchCommand,
  LaunchType,
} from "@raycast/api";

export function MissingSettings() {
  return (
    <Detail
      markdown={`# Missing Stores\n\nYou need to add your WooCommerce stores before using this feature.\n\nPress **⏎ Enter** to manage your stores.`}
      actions={
        <ActionPanel>
          <Action
            title="Manage Stores"
            onAction={() =>
              launchCommand({
                name: "manage-stores",
                type: LaunchType.UserInitiated,
              })
            }
          />
        </ActionPanel>
      }
    />
  );
}
