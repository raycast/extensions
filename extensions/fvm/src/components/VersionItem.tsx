import { Action, ActionPanel, Color, Icon, Image, List } from "@raycast/api";
import { CachedFlutterVersion, FlutterSdkRelease } from "../lib/models";
import { friendlyDate } from "../lib/utils";
import { VersionCopyActionSection } from "./ActionPanel";

type Props = {
  release: FlutterSdkRelease;
  cached: CachedFlutterVersion | undefined;
  onAction?: () => void;
  onShowDetail: () => void;
  onInstall: () => void;
  onRemove: () => void;
  onSetup: () => void;

  isChannel: boolean;
};

export function VersionItem(props: Props): JSX.Element {
  const { release, cached, isChannel } = props;

  let tintColor = Color.SecondaryText;
  let tooltip: string = "Not Installed";
  let iconSource: Image.Source = Icon.Circle;

  const isCached = !!cached;

  const needSetup = isCached && !cached.isSetup;

  if (cached) {
    tintColor = Color.Green;
    tooltip = "Installed";
    iconSource = Icon.CheckCircle;
  }

  if (cached && needSetup) {
    iconSource = Icon.CircleProgress50;
    tooltip = "Needs Setup";
  }

  const icon = { source: iconSource, tintColor } as Image;

  const channelAccesory = { tag: release.channel };

  const iconAccessory = { icon: icon, tooltip: tooltip };

  return (
    <List.Item
      key={release.hash + release.channel}
      title={isChannel ? release.channel : release.version}
      subtitle={isChannel ? release.version : ""}
      accessories={[channelAccesory, iconAccessory]}
      detail={<ReleaseDetail release={release} />}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Actions">
            <Action title="View Detail" onAction={props.onShowDetail} />
            {needSetup && <Action title="Setup" onAction={props.onSetup} shortcut={{ key: "s", modifiers: ["cmd"] }} />}
            {!isCached && <Action title="Install" onAction={props.onInstall} />}
            {isCached && (
              <Action title="Remove" shortcut={{ key: "r", modifiers: ["cmd"] }} onAction={props.onRemove} />
            )}
          </ActionPanel.Section>
          <VersionCopyActionSection version={release} />
        </ActionPanel>
      }
    />
  );
}

const ReleaseDetail = ({ release }: { release: FlutterSdkRelease }) => (
  <List.Item.Detail
    metadata={
      <List.Item.Detail.Metadata>
        <List.Item.Detail.Metadata.Label title="Version" text={release.version} />
        <List.Item.Detail.Metadata.Separator />
        <List.Item.Detail.Metadata.Label title="Release Date" text={friendlyDate(release.release_date)} />
        <List.Item.Detail.Metadata.Separator />
        <List.Item.Detail.Metadata.TagList title="Channel">
          <List.Item.Detail.Metadata.TagList.Item text={release.channel} color={Color.Blue} />
        </List.Item.Detail.Metadata.TagList>
        <List.Item.Detail.Metadata.Separator />
        <List.Item.Detail.Metadata.Link title="Archive" target={release.archive} text="Download" />
        <List.Item.Detail.Metadata.Separator />
        <List.Item.Detail.Metadata.Label
          title="Active Channel"
          icon={release.active_channel ? Icon.CheckCircle : Icon.XMarkCircle}
        />

        {release.dart_sdk_version && (
          <>
            <List.Item.Detail.Metadata.Separator />
            <List.Item.Detail.Metadata.Label title="Dart SDK Version" text={release.dart_sdk_version} />
          </>
        )}
        {release.dart_sdk_arch && (
          <>
            <List.Item.Detail.Metadata.Separator />
            <List.Item.Detail.Metadata.Label title="Dart SDK Architecture" text={release.dart_sdk_arch} />
          </>
        )}
      </List.Item.Detail.Metadata>
    }
  />
);
