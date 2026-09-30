import { Action, ActionPanel, Color, Icon, Image, List } from "@raycast/api";

import { CachedFlutterVersion } from "../lib/models";
import { VersionCopyActionSection } from "./ActionPanel";

type Props = {
  version: CachedFlutterVersion;
  onAction?: () => void;
  onShowDetail: () => void;
  onRemove: () => void;
  onSetup: () => void;
};

export function CachedVersionItem(props: Props): JSX.Element {
  const { version } = props;

  let tintColor = Color.SecondaryText;
  let tooltip: string = "Not Installed";
  let iconSource: Image.Source = Icon.Circle;

  const isCached = !!version;

  const needSetup = isCached && !version.isSetup;

  if (version) {
    tintColor = Color.Green;
    tooltip = "Installed";
    iconSource = Icon.CheckCircle;
  }

  if (version && needSetup) {
    iconSource = Icon.CircleProgress50;
    tooltip = "Needs Setup";
  }

  const icon = { source: iconSource, tintColor } as Image;

  const iconAccessory = { icon: icon, tooltip: tooltip };

  return (
    <List.Item
      key={version.name}
      title={version.name}
      accessories={[iconAccessory]}
      detail={<VersionItemDetail version={version} />}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Actions">
            <Action title="View Detail" icon={Icon.Info} onAction={props.onShowDetail} />
            <Action.Open
              title="Open Directory"
              icon={Icon.Folder}
              target={version.directory}
              shortcut={{ key: "o", modifiers: ["cmd"] }}
            />

            {needSetup && <Action title="Setup" onAction={props.onSetup} shortcut={{ key: "s", modifiers: ["cmd"] }} />}

            <Action
              title="Remove"
              shortcut={{ key: "r", modifiers: ["cmd"] }}
              icon={Icon.DeleteDocument}
              onAction={props.onRemove}
            />
          </ActionPanel.Section>
          <VersionCopyActionSection version={version} />
        </ActionPanel>
      }
    />
  );
}

const VersionItemDetail = ({ version }: { version: CachedFlutterVersion }) => (
  <List.Item.Detail
    metadata={
      <List.Item.Detail.Metadata>
        <List.Item.Detail.Metadata.Label title="Name" text={version.name} />
        <List.Item.Detail.Metadata.Separator />
        <List.Item.Detail.Metadata.Label title="Directory" text={version.directory} />
        <List.Item.Detail.Metadata.Separator />
        <List.Item.Detail.Metadata.TagList title="Type">
          <List.Item.Detail.Metadata.TagList.Item text={version.type} color={Color.Blue} />
        </List.Item.Detail.Metadata.TagList>

        {version.flutterSdkVersion && (
          <>
            <List.Item.Detail.Metadata.Separator />
            <List.Item.Detail.Metadata.Label title="Flutter SDK Version" text={version.flutterSdkVersion} />
          </>
        )}
        {version.dartSdkVersion && (
          <>
            <List.Item.Detail.Metadata.Separator />
            <List.Item.Detail.Metadata.Label title="Dart SDK Version" text={version.dartSdkVersion} />
          </>
        )}
      </List.Item.Detail.Metadata>
    }
  />
);
