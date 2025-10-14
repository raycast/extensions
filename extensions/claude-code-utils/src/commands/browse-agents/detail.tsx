import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { PasteAction } from "../../components/paste-action";
import { Agent } from "../../utils/agent";
import { formatCodeBlock } from "../../utils/markdown-formatter";

interface AgentDetailProps {
  agent: Agent;
}

export default function AgentDetail({ agent }: AgentDetailProps) {
  const markdown = formatCodeBlock(agent.content);

  return (
    <Detail
      markdown={markdown}
      navigationTitle={agent.name}
      actions={
        <ActionPanel>
          <PasteAction content={"/" + agent.name} />
          <Action.CopyToClipboard
            title="Copy to Clipboard"
            content={agent.content}
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd"], key: "enter" }}
          />
          <Action.ShowInFinder path={agent.filePath} shortcut={{ modifiers: ["cmd", "shift"], key: "f" }} />
          <Action.OpenWith path={agent.filePath} shortcut={{ modifiers: ["cmd"], key: "o" }} />
        </ActionPanel>
      }
    />
  );
}
