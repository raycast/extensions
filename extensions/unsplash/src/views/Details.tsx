import { Detail, Icon } from "@raycast/api";
import Actions from "@/components/Actions";
import { SearchResult } from "@/types";

export function Details({ result }: { result: SearchResult }) {
  const image = result.urls.regular || result.urls.small || result.urls.thumb;
  const date = result.created_at ? new Date(result.created_at).toLocaleString() : "Unknown";

  return (
    <Detail
      markdown={`![${result.alt_description}](${image})`}
      navigationTitle={result.user?.name}
      metadata={
        <Detail.Metadata>
          {result.description && <Detail.Metadata.Label title="Description" text={result.description} />}
          <Detail.Metadata.Link title="Author" text={result.user.username} target={result.user.links.html} />
          <Detail.Metadata.Label title="Uploaded On" text={date} icon={Icon.Calendar} />
          <Detail.Metadata.Label title="Likes" text={String(result.likes)} icon={Icon.Heart} />
          <Detail.Metadata.Label title="Dimensions" text={`${result.width}x${result.height}`} icon={Icon.AppWindow} />
        </Detail.Metadata>
      }
      actions={<Actions item={result} />}
    />
  );
}

export default Details;
