import { Action, ActionPanel, Detail } from "@raycast/api";
import { typeColor, typeDescription } from "./utils";
import { Alias } from "./types";

export default function CommandDetail({ alias, onCopy }: { alias: Alias; onCopy: () => void }) {
  const markdown = `
# ${alias.name}
###
\`\`\`
${alias.command}
\`\`\`

### ${alias.description}

${typeDescription(alias.type)}

[Search command on the Git Documentation ↗](https://git-scm.com/search/results?search=${encodeURIComponent(alias.command)})
###
`;
  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Alias" content={alias.name} onCopy={onCopy} />
          <Action.OpenInBrowser title="Search on Git Documentation" url={`https://git-scm.com/search/results?search=${encodeURIComponent(alias.command)}`} />
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Type">
            <Detail.Metadata.TagList.Item text={alias.type} color={typeColor(alias.type)} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
        </Detail.Metadata>
      }
    />
  );
}
