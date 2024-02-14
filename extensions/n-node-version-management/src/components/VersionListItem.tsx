import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { VersionInformation, VersionSource } from "../util/nClient";

function getVersionIcon(version: VersionInformation): Icon {
  switch (version.type) {
    case VersionSource.Local:
      return Icon.Circle;
    case VersionSource.Network:
      return Icon.Download;
  }
}

export function VersionListItem(
  version: VersionInformation,
  isActiveVersion: boolean,
  onActivateVersionClick: (version: string) => void,
  onDeleteVersionClick: (version: string) => void,
  onDownloadAndActivateVersionClick: (version: string) => void,
) {
  return (
    <List.Item
      key={version.version}
      title={version.version}
      icon={isActiveVersion ? Icon.CheckCircle : getVersionIcon(version)}
      actions={
        <ActionPanel>
          {version.type == VersionSource.Local && (
            <>
              <Action
                title="Activate Version"
                icon={Icon.CheckCircle}
                onAction={() => onActivateVersionClick(version.version)}
              />
              <Action title="Delete Version" icon={Icon.Trash} onAction={() => onDeleteVersionClick(version.version)} />
            </>
          )}
          {version.type == VersionSource.Network && (
            <Action
              title="Download and Activate Version"
              icon={Icon.Download}
              onAction={() => onDownloadAndActivateVersionClick(version.version)}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
