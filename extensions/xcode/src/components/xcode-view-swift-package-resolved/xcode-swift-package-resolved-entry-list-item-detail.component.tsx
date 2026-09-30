import { List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { fetchOpenGraphImageUrl } from "../../shared/fetch-open-graph-image-url";
import { XcodeSwiftPackageResolvedEntry } from "../../models/swift-package-resolved/xcode-swift-package-resolved-entry.model";
import { XcodeSwiftPackageResolvedService } from "../../services/xcode-swift-package-resolved.service";

/**
 * Xcode Swift Package Resolved Entry List Item Detail
 */
export function XcodeSwiftPackageResolvedEntryListItemDetail(props: { entry: XcodeSwiftPackageResolvedEntry }) {
  const imageUrl = usePromise(() => fetchOpenGraphImageUrl(props.entry.location), [], {
    onError: () => Promise.resolve(),
  });
  const latestVersion = usePromise(() => XcodeSwiftPackageResolvedService.getLatestVersion(props.entry), [], {
    onError: () => Promise.resolve(),
  });
  return (
    <List.Item.Detail
      isLoading={imageUrl.isLoading}
      markdown={imageUrl.data ? `![Image](${imageUrl.data})` : undefined}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Link title="Location" target={props.entry.location} text={props.entry.location} />
          {props.entry.version ? (
            <List.Item.Detail.Metadata.Label title="Version" text={props.entry.version} />
          ) : undefined}
          {props.entry.branch ? (
            <List.Item.Detail.Metadata.Label title="Branch" text={props.entry.branch} />
          ) : undefined}
          {props.entry.revision ? (
            <List.Item.Detail.Metadata.Label title="Revision" text={props.entry.revision} />
          ) : undefined}
          {latestVersion.data ? <List.Item.Detail.Metadata.Separator /> : undefined}
          {latestVersion.data ? (
            <List.Item.Detail.Metadata.Label title="Latest Version" text={latestVersion.data} />
          ) : undefined}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
