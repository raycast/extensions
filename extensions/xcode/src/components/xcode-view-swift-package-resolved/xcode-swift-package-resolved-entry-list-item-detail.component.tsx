import { List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { fetchOpenGraphImageUrl } from "../../shared/fetch-open-graph-image-url";
import { XcodeSwiftPackageResolvedEntry } from "../../models/swift-package-resolved/xcode-swift-package-resolved-entry.model";

/**
 * Xcode Swift Package Resolved Entry List Item Detail
 */
export function XcodeSwiftPackageResolvedEntryListItemDetail(props: {
  entry: XcodeSwiftPackageResolvedEntry;
}): JSX.Element {
  const imageUrl = usePromise(() => fetchOpenGraphImageUrl(props.entry.location), [], {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    onError: () => {},
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
        </List.Item.Detail.Metadata>
      }
    />
  );
}
