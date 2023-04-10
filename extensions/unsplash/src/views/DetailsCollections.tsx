import { Detail } from "@raycast/api";

// Components
import Actions from "../components/ActionsCollection";

export const Details: React.FC<{ result: CollectionResult }> = ({ result }) => {
  const coverImage =
    result.cover_photo?.urls?.regular || result.cover_photo?.urls?.small || result.cover_photo?.urls?.thumb;

  const date = result.published_at ? new Date(result.published_at).toLocaleString() : "Unknown";

  const detailsMarkdown = [
    result.description && `# ${result.description}`,
    result.user?.name && `**Collection by [${result.user.name}](${result.user.links.html})**`,
    coverImage && `![image](${coverImage})`,
    result.published_at && `**Published On**: ${date}`,
    result.total_photos && `**Total Photos**: ${result.total_photos}`,
  ];

  return (
    <Detail
      markdown={detailsMarkdown
        .filter((i) => i)
        .map((i) => i + "\n")
        .join("\n")}
      navigationTitle={result.user?.name}
      actions={<Actions item={result} />}
    />
  );
};

export default Details;
