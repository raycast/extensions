import { Action, ActionPanel, Icon, List, confirmAlert } from "@raycast/api";
import { useCommandHistory } from "./api/useCommandHistory";

export default function History() {
  const { history, clearHistory, isLoading } = useCommandHistory();

  return (
    <List isShowingDetail isLoading={isLoading}>
      {history.map((item) => (
        <List.Item
          key={item.id}
          title={item.prompt.length > 60 ? item.prompt.substring(0, 60) + "..." : item.prompt}
          subtitle={new Date(item.timestamp).toLocaleString()}
          accessories={[
            {
              text: item.model ? `Model: ${item.model}` : "Model: Not specified",
              tooltip: "Model used for this query",
            },
          ]}
          detail={
            <List.Item.Detail
              markdown={`## Prompt\n\n${item.prompt}\n\n---\n\n## Response\n\n${
                item.response
              }\n\n---\n\n**Time**: ${new Date(item.timestamp).toLocaleString()}\n**Model**: ${
                item.model || "Not specified"
              }`}
            />
          }
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy Response"
                content={item.response}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              <Action.CopyToClipboard
                title="Copy Prompt"
                content={item.prompt}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
              <Action
                title="Clear History"
                icon={Icon.Trash}
                shortcut={{ modifiers: ["shift", "cmd"], key: "backspace" }}
                onAction={async () => {
                  if (await confirmAlert({ title: "Are you sure?" })) {
                    clearHistory();
                  }
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
