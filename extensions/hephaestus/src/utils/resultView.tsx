import { Action, ActionPanel, Detail } from "@raycast/api";

export const ResultDetailView = ({ result }: { result: string }) => {
  return (
    <Detail
      markdown={`\`\`\`json\n${result}\n\`\`\``}
      navigationTitle="Result"
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy" content={result} />
        </ActionPanel>
      }
    />
  );
};
