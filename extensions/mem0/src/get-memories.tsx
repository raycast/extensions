import { List, Action, ActionPanel, Icon } from "@raycast/api";
import { useGetMemories } from "./hooks";
import { Memory } from "./types";

export default function Command() {
  const { memories, isLoading, error } = useGetMemories({ pageSize: 50 });

  if (error) {
    return (
      <List>
        <List.Item title={`Error: ${error.message}`} />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} navigationTitle={`Memories (${memories.length} total)`}>
      {memories.map((memory: Memory) => (
        <List.Item
          key={memory.id}
          title={memory.memory || "No memory content"}
          subtitle={memory.user_id || "Unknown user"}
          accessories={[
            { text: memory.created_at ? new Date(memory.created_at).toLocaleString() : "Unknown date" },
            { icon: Icon.Clipboard, tooltip: "Copy Memory" },
          ]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy Memory"
                content={memory.memory || "No memory content"}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
