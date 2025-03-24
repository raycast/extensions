import { Action, ActionPanel, Detail } from "@raycast/api";
import { getUsagePercentage } from "../util";
import { Record } from "../types";

export default function RecordDetail({ record }: { record: Record }) {
  const md = `
  ## ${record.title}
  ---
  **API Key:** \`You can copy this through action\`

  **Description:**
  \`\`\`
  ${(record.description || "").replace(/\n/g, "\n\n")}
  \`\`\`

  **Usage:** ${record.usage.usedCharacters} / ${record.usage.totalCharacters} (${getUsagePercentage(record.usage)}%)
`;
  return (
    <Detail
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Api Key" content={record.apiKey} />
          <Action.CopyToClipboard title="Copy Description" content={record.description} />
        </ActionPanel>
      }
      navigationTitle="Record Details"
      markdown={md}
    />
  );
}
