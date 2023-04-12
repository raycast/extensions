import { SwiftPackageIndexSearchResult } from "../../models/swift-package-index/swift-package-index-search-result.model";
import { List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { fetchOpenGraphImageUrl } from "../../shared/fetch-open-graph-image-url";

/**
 * Swift Package Index List Item
 */
export function SwiftPackageIndexListItemDetail(props: { searchResult: SwiftPackageIndexSearchResult }): JSX.Element {
  const imageUrl = usePromise(() => fetchOpenGraphImageUrl(props.searchResult.url), [], {
    onError: () => Promise.resolve(),
  });
  return (
    <List.Item.Detail
      isLoading={imageUrl.isLoading}
      markdown={imageUrl.data ? `![Image](${imageUrl.data})` : undefined}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Name" text={props.searchResult.name} />
          <List.Item.Detail.Metadata.Label title="About" text={props.searchResult.description} />
          <List.Item.Detail.Metadata.Label title="Author" text={props.searchResult.author} />
          <List.Item.Detail.Metadata.Label
            title="Last Activity"
            text={props.searchResult.lastActivityAt?.toLocaleDateString()}
          />
          <List.Item.Detail.Metadata.Link title="URL" target={props.searchResult.url} text={props.searchResult.url} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}
