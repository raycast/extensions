import { Detail, ActionPanel, Action } from "@raycast/api";

export function JsonItem({ json }: { json: object }) {
  return (
    <Detail
      markdown={`\`\`\`json\n${JSON.stringify(json, null, 2)}\n\`\`\``}
      navigationTitle="Raw Data"
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Raw Data"
            content={JSON.stringify(json, null, 2)}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}
