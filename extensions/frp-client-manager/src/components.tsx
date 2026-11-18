import {
  Action,
  ActionPanel,
  Icon,
  List,
  openExtensionPreferences,
} from "@raycast/api";

export function MissingFrpDir({ frpDir }: { frpDir: string }) {
  return (
    <List.EmptyView
      icon={Icon.Folder}
      title="frp directory not found"
      description={`"${frpDir}" does not exist. Point the extension at the folder that contains frpc.toml and the frp_* binary directories.`}
      actions={
        <ActionPanel>
          <Action
            title="Open Extension Preferences"
            icon={Icon.Gear}
            onAction={openExtensionPreferences}
          />
        </ActionPanel>
      }
    />
  );
}
