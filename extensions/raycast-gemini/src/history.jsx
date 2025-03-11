import { Action, ActionPanel, Icon, List, LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";

let commandHistory = [];

export default function History() {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    // Load history from LocalStorage when component mounts
    LocalStorage.getItem("gemini_command_history").then((storedHistory) => {
      if (storedHistory) {
        // Ensure we're working with unique entries by using a Set with id as key
        const historyData = JSON.parse(storedHistory);
        // Create a Map to deduplicate entries by id
        const uniqueEntries = new Map();
        historyData.forEach((item) => {
          if (!uniqueEntries.has(item.id)) {
            uniqueEntries.set(item.id, item);
          }
        });

        // Convert Map values back to array
        commandHistory = Array.from(uniqueEntries.values());
        setHistory(commandHistory);
      }
    });
  }, []);

  return (
    <List isShowingDetail>
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
                shortcut={{ modifiers: ["ctrl", "cmd"], key: "x" }}
                onAction={async () => {
                  commandHistory = [];
                  setHistory([]);
                  await LocalStorage.removeItem("gemini_command_history");
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
