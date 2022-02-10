import { Detail } from "@raycast/api";

// Components
import Actions from "../components/Actions";

export const Details: React.FC<{ result: SearchResult }> = ({ result }) => {
  const image = result.urls?.regular || result.urls?.small || result.urls?.thumb;
  const date = result.created_at ? new Date(result.created_at).toLocaleString() : "Unknown";

  const detailsMarkdown = [
    result.description && `# ${result.description}`,
    result.user?.name && `**Photo by [${result.user.name}](${result.user.links.html})**`,
    image && `![image](${image})`,
    result.alt_description && `**Description**: ${result.alt_description}`,
    result.created_at && `**Uploaded On**: ${date}`,
    result.likes && `**Likes**: ${result.likes}`,
    result.width && result.height && `**Ratio**: ${result.width}x${result.height}`,
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
