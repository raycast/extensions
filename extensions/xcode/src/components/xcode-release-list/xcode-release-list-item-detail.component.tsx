import { List } from "@raycast/api";
import { XcodeRelease } from "../../models/xcode-release/xcode-release.model";

/**
 * Xcode Release List Item Detail
 */
export function XcodeReleaseListItemDetail(props: { release: XcodeRelease }) {
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="About" />
          <List.Item.Detail.Metadata.Label title="Version" text={props.release.versionNumber} />
          {props.release.beta ? (
            <List.Item.Detail.Metadata.Label title="Beta" text={String(props.release.beta)} />
          ) : undefined}
          {props.release.releaseCandidate ? (
            <List.Item.Detail.Metadata.Label title="Release Candidate" text={String(props.release.releaseCandidate)} />
          ) : undefined}
          <List.Item.Detail.Metadata.Label title="Build" text={props.release.buildNumber} />
          <List.Item.Detail.Metadata.Label title="Released" text={props.release.date.toLocaleDateString()} />
          {props.release.swiftVersion ? (
            <List.Item.Detail.Metadata.Label title="Swift" text={props.release.swiftVersion} />
          ) : undefined}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="SDKs" />
          {props.release.sdks
            .filter((sdk) => sdk.version)
            .map((sdk) => (
              <List.Item.Detail.Metadata.Label key={sdk.name} title={sdk.name} text={sdk.version} />
            ))}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
