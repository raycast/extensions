import { Action, ActionPanel, Color, Detail, Icon, List, showToast, Toast } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";

type HistoryEntry = {
  port: number;
  createdAt: string;
  updatedAt: string;
};

export default function Command() {
  const {
    value: history,
    setValue: setHistory,
    isLoading,
  } = useLocalStorage<Record<string, HistoryEntry>>("port-history-v1", {});

  const items = Object.entries(history ?? {})
    .map(([projectName, entry]) => ({ projectName, ...entry }))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  async function handleDelete(projectName: string) {
    const next = { ...(history ?? {}) };
    delete next[projectName];
    await setHistory(next);
    await showToast({ style: Toast.Style.Success, title: "Deleted from history", message: projectName });
  }

  async function handleClearAll() {
    await setHistory({});
    await showToast({ style: Toast.Style.Success, title: "Cleared history" });
  }

  if (!isLoading && items.length === 0) {
    return (
      <Detail
        markdown={"# No Port History\n\nGenerate a port from the other command to start building history."}
        actions={
          <ActionPanel>
            <Action title="Clear History" onAction={handleClearAll} style={Action.Style.Destructive} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List isLoading={isLoading} navigationTitle="Port History" searchBarPlaceholder="Filter by project name">
      {items.map((item) => (
        <List.Item
          key={item.projectName}
          title={item.projectName}
          accessories={[{ tag: { value: String(item.port), color: Color.Blue } }, { date: new Date(item.updatedAt) }]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Port" content={String(item.port)} />
              <Action.CopyToClipboard title="Copy Project Name" content={item.projectName} />
              <Action.CopyToClipboard title="Copy Project:port" content={`${item.projectName}:${item.port}`} />
              <ActionPanel.Section>
                <Action
                  title="Delete Entry"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => void handleDelete(item.projectName)}
                />
                <Action
                  title="Clear All History"
                  icon={Icon.XmarkCircle}
                  style={Action.Style.Destructive}
                  onAction={() => void handleClearAll()}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
