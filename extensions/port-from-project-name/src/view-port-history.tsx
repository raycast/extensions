import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  Keyboard,
  launchCommand,
  LaunchType,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast, useLocalStorage } from "@raycast/utils";

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
    const confirmed = await confirmAlert({
      title: "Clear All History",
      message: "Are you sure you want to clear all port history? This action cannot be undone.",
      primaryAction: {
        title: "Clear",
        style: Alert.ActionStyle.Destructive,
      },
      rememberUserChoice: true,
    });

    if (!confirmed) {
      return;
    }

    await setHistory({});
    await showToast({ style: Toast.Style.Success, title: "Cleared history" });
  }

  if (!isLoading && items.length === 0) {
    return (
      <List
        actions={
          <ActionPanel>
            <Action
              title="Generate Port"
              onAction={async () => {
                try {
                  await launchCommand({ name: "generate-port", type: LaunchType.UserInitiated });
                } catch (error) {
                  await showFailureToast(error, { title: "Failed to launch command" });
                }
              }}
            />
            <Action title="Clear History" onAction={handleClearAll} style={Action.Style.Destructive} />
          </ActionPanel>
        }
      >
        <List.EmptyView
          title="No Port History Found"
          description="Generate a port to start building your history."
          icon={Icon.Warning}
        />
      </List>
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
              <Action.CopyToClipboard title="Copy Project:Port" content={`${item.projectName}:${item.port}`} />
              <ActionPanel.Section>
                <Action
                  title="Delete Entry"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  onAction={() => void handleDelete(item.projectName)}
                />
                <Action
                  title="Clear All History"
                  icon={Icon.XMarkCircle}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.RemoveAll}
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
