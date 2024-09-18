import { Action, ActionPanel } from "@raycast/api";
import { CachedFlutterVersion, FlutterSdkRelease } from "../lib/models";

type Props = {
  version: FlutterSdkRelease | CachedFlutterVersion;
};

export function VersionCopyActionSection(props: Props): JSX.Element {
  const { version } = props;

  const flutterSdkVersion = isFlutterRelease(version) ? version.version : version.flutterSdkVersion;

  const dartSdkVersion = isFlutterRelease(version) ? version.dart_sdk_version : version.dartSdkVersion;

  const hash = isFlutterRelease(version) ? version.hash : null;

  return (
    <ActionPanel.Section title="Copy">
      <Action.CopyToClipboard title="Flutter Version" content={flutterSdkVersion ?? ""} />
      <Action.CopyToClipboard title="Dart Version" content={dartSdkVersion ?? ""} />
      {hash && <Action.CopyToClipboard title="Hash" content={hash} />}
    </ActionPanel.Section>
  );
}

export function isFlutterRelease(version: FlutterSdkRelease | CachedFlutterVersion): version is FlutterSdkRelease {
  return (version as FlutterSdkRelease).hash !== undefined && (version as FlutterSdkRelease).release_date !== undefined;
}
