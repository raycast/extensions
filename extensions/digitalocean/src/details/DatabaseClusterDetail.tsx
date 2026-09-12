import { DatabaseCluster } from "../client";
import { Action, ActionPanel, Detail } from "@raycast/api";

export default function DatabaseClusterDetail({ database }: { database: DatabaseCluster }) {
  return (
    <Detail
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={`https://cloud.digitalocean.com/databases/${database.id}`} />
          {database.connection?.uri ? (
            <Action.CopyToClipboard content={database.connection?.uri} title="Copy Connection URI" />
          ) : null}
        </ActionPanel>
      }
      markdown={`\
# ${database.name}

${
  database.connection?.uri
    ? `### Connection URI
\`\`\`
${database.connection.uri}
\`\`\`
`
    : ""
}

${
  database.private_connection?.uri
    ? `### Private Connection URI
\`\`\`
${database.private_connection.uri}
\`\`\`
`
    : ""
}

`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Engine" text={database.engine} />
          {!database.version ? null : <Detail.Metadata.Label title="Version" text={database.version} />}
          <Detail.Metadata.Label title="Nodes" text={String(database.num_nodes)} />
          <Detail.Metadata.Label title="Size" text={database.size} />
          <Detail.Metadata.Label title="Region" text={database.region} />
          <Detail.Metadata.Label title="Status" text={database.status} />
          {!database.tags || database.tags.length === 0 ? null : (
            <Detail.Metadata.TagList title="Tags">
              {database.tags.map((tag) => (
                <Detail.Metadata.TagList.Item key={tag} text={tag} />
              ))}
            </Detail.Metadata.TagList>
          )}
        </Detail.Metadata>
      }
    />
  );
}
