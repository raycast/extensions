import { Detail, ActionPanel, Action, Icon } from "@raycast/api";
import { ArcVirtualKeyWithToken } from "../types";

interface ArcKeyTokenDetailProps {
  keyRecord: ArcVirtualKeyWithToken;
}

export function ArcKeyTokenDetail({ keyRecord }: ArcKeyTokenDetailProps) {
  const markdown = `# Virtual Key Created

Your access token is shown below. **This is the only time it will be displayed** — copy it now and store it securely.

\`\`\`
${keyRecord.access_token}
\`\`\`

Use it as a bearer token when sending AI traffic to the Fastly AI Gateway:

\`\`\`
Authorization: Bearer <access token>
\`\`\`
`;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={keyRecord.name}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Name" text={keyRecord.name} />
          <Detail.Metadata.Label title="Key ID" text={keyRecord.id} />
          <Detail.Metadata.Label title="Provider" text={keyRecord.provider} />
          <Detail.Metadata.Label title="Model" text={keyRecord.model} />
          <Detail.Metadata.Label
            title="Expires"
            text={keyRecord.expires_at ? new Date(keyRecord.expires_at).toLocaleString() : "Never"}
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Access Token" content={keyRecord.access_token} concealed />
          <Action.CopyToClipboard title="Copy Key ID" content={keyRecord.id} icon={Icon.Key} />
        </ActionPanel>
      }
    />
  );
}
