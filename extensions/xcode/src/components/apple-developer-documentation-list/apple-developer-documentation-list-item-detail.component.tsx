import { AppleDeveloperDocumentationEntry } from "../../models/apple-developer-documentation/apple-developer-documentation-entry.model";
import { List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { fetchOpenGraphImageUrl } from "../../shared/fetch-open-graph-image-url";
import { AppleDeveloperDocumentationEntryTypeName } from "../../shared/apple-developer-documentation-entry-type-name";

/**
 * Apple Developer Documentation List Item Detail
 */
export function AppleDeveloperDocumentationListItemDetail(props: { entry: AppleDeveloperDocumentationEntry }) {
  const imageUrl = usePromise(() => fetchOpenGraphImageUrl(props.entry.url), [], {
    onError: () => Promise.resolve(),
  });
  return (
    <List.Item.Detail
      isLoading={imageUrl.isLoading}
      markdown={imageUrl.data ? `![Image](${imageUrl.data})${props.entry.description}` : props.entry.description}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Title" text={props.entry.title} />
          <List.Item.Detail.Metadata.Label
            title="Type"
            text={AppleDeveloperDocumentationEntryTypeName(props.entry.type)}
          />
          <List.Item.Detail.Metadata.TagList title="Categories">
            {props.entry.platform.map((platform) => (
              <List.Item.Detail.Metadata.TagList.Item key={platform} text={platform} />
            ))}
          </List.Item.Detail.Metadata.TagList>
        </List.Item.Detail.Metadata>
      }
    />
  );
}
