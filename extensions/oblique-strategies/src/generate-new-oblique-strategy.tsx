import { Action, ActionPanel, Detail } from "@raycast/api";
import { useAI } from "@raycast/utils";

const OBLIQUE_PROMPT = "Create a new oblique strategy in the vain of Brian Eno and Peter Schmidt. Only reply with the short suggestion, nothing else."

export default function Command() {
  const { data, isLoading } = useAI(OBLIQUE_PROMPT);

  return <Detail 
    isLoading={isLoading} 
    markdown={data} 
    actions={
      <ActionPanel>
        <Action.CopyToClipboard content={data} shortcut={{ modifiers: ["cmd"], key: "c" }} />
        <Action.Paste content={data} shortcut={{ modifiers: ["cmd"], key: "v" }} />
      </ActionPanel>
    }
  />;
}