import { useCallback } from "react";
import { Action, ActionPanel, confirmAlert, Icon, List } from "@raycast/api";
import { ChatHistoryEntry, useChatHistory } from "./hooks/useChatHistory";
import { toLocalTime } from "./utils";

export default function History() {
  const { history, isLoading, clearHistory } = useChatHistory();

  const generateMarkdown = useCallback((entry: ChatHistoryEntry) => {
    return `## Prompt
    ${entry.prompt}
    ---
    ## Response
    ${entry.response}
    ---
    **Time**: ${toLocalTime(entry.timestamp)}
    **Model**: ${entry.model || "Not specified"}
  `;
  }, []);

  const handleClearHistory = useCallback(async () => {
    if (await confirmAlert({ title: "Are you sure?" })) {
      clearHistory();
    }
  }, [clearHistory]);

  return (
    <List isLoading={isLoading}>
      {history.map(entry => (
        <List.Item
          key={entry.id}
          title={entry.prompt.substring(0, 60)}
          subtitle={toLocalTime(entry.timestamp)}
          accessories={[
            {
              text: `Model: ${entry.model || "Not specified"}`,
              tooltip: "Model used for this query",
            },
          ]}
          detail={<List.Item.Detail markdown={generateMarkdown(entry)} />}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy Response"
                content={entry.response}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              <Action.CopyToClipboard
                title="Copy Prompt"
                content={entry.prompt}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
              <Action
                title="Clear History"
                icon={Icon.Trash}
                shortcut={{ modifiers: ["shift", "cmd"], key: "backspace" }}
                onAction={handleClearHistory}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
