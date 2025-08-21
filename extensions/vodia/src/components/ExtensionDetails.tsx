import { Detail, ActionPanel, Action, Icon } from "@raycast/api";

interface ExtensionDetailsProps {
  extension: {
    id: number;
    name: string;
    first_name: string;
    display_name: string;
    dnd: boolean;
    email_address: string;
    alias: string[];
    domain: string;
  };
}

export function ExtensionDetails({ extension }: ExtensionDetailsProps) {
  const markdown = `
# ${extension.first_name} ${extension.display_name}

## Extension Details
- **ID:** ${extension.id}
- **Domain:** ${extension.domain}
- **Email:** ${extension.email_address}
- **DND Status:** ${extension.dnd ? "Enabled" : "Disabled"}
${
  extension.alias?.length > 1
    ? `\n## Additional Aliases\n${extension.alias
        .slice(1)
        .map((alias) => `- ${alias}`)
        .join("\n")}`
    : ""
}
`;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={`${extension.first_name} ${extension.display_name}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Extension" text={extension.id.toString()} />
          <Detail.Metadata.Label title="Domain" text={extension.domain} />
          <Detail.Metadata.Label title="Email" text={extension.email_address} />
          <Detail.Metadata.Label
            title="DND Status"
            text={extension.dnd ? "Enabled" : "Disabled"}
            icon={extension.dnd ? Icon.CircleFilled : Icon.Circle}
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Extension Id"
            content={extension.id.toString()}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action.CopyToClipboard
            title="Copy Email"
            content={extension.email_address}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <Action.OpenInBrowser
            title="Open Domain"
            shortcut={{ modifiers: ["cmd"], key: "o" }}
            url={`https://${extension.domain}`}
          />
        </ActionPanel>
      }
    />
  );
}
