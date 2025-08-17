import { Detail, Icon } from "@raycast/api";

// Components
import Actions from "@/components/ActionsCollection";
import { CollectionResult } from "@/types";

export const Details: React.FC<{ result: CollectionResult }> = ({ result }) => {
  const coverImage =
    result.cover_photo?.urls?.regular || result.cover_photo?.urls?.small || result.cover_photo?.urls?.thumb;
  const date = result.published_at ? new Date(result.published_at).toLocaleString() : "Unknown";

  return (
    <Detail
      markdown={`![${result.title}](${coverImage})`}
      navigationTitle={result.user?.name}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Title" text={result.title} />
          {result.description && <Detail.Metadata.Label title="Description" text={result.description} />}
          <Detail.Metadata.Link title="Author" text={result.user.username} target={result.user.links.html} />
          <Detail.Metadata.Label title="Published On" text={date} icon={Icon.Calendar} />
          <Detail.Metadata.Label title="Total Photos" text={String(result.total_photos)} icon={Icon.Plus} />
        </Detail.Metadata>
      }
      actions={<Actions item={result} />}
    />
  );
};

export default Details;
