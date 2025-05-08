import { ActionPanel, Action, List } from "@raycast/api";
import { Tool } from "../data/tools";

export function ToolItem({ tool }: { tool: Tool }) {
  return (
    <List.Item
      title={tool.name}
      icon={{ source: tool.icon }}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={tool.url} title={`Open ${tool.name}`} />
        </ActionPanel>
      }
    />
  );
}
