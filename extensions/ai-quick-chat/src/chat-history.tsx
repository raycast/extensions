import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { ConversationView } from "./chat-view";
import {
  clearHistory,
  deleteSession,
  getStorageStats,
  listSessionMetadata,
} from "./history-store";
import { HistorySettingsForm } from "./history-settings-form";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = units[0];
  for (let index = 1; index < units.length && value >= 1024; index += 1) {
    value /= 1024;
    unit = units[index];
  }
  return `${value.toFixed(value >= 10 ? 1 : 2)} ${unit}`;
}

async function loadHistory() {
  return {
    sessions: await listSessionMetadata(),
    stats: await getStorageStats(),
  };
}

export default function ChatHistoryCommand() {
  const { data, isLoading, revalidate } = usePromise(loadHistory);
  const sessions = data?.sessions ?? [];

  const remove = async (id: string, title: string) => {
    const confirmed = await confirmAlert({
      title: `Delete “${title}”?`,
      message: "This encrypted conversation cannot be recovered.",
      primaryAction: {
        title: "Delete Conversation",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;
    await deleteSession(id);
    await revalidate();
  };

  const removeAll = async () => {
    const confirmed = await confirmAlert({
      title: "Delete all conversations?",
      message:
        "All encrypted chat history will be permanently removed. Provider settings are not affected.",
      primaryAction: {
        title: "Delete All",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;
    await clearHistory();
    await revalidate();
    await showToast({
      style: Toast.Style.Success,
      title: "Chat history cleared",
    });
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search saved conversations..."
      navigationTitle={
        data
          ? `Chat History — ${data.stats.sessionCount} chats, ${formatBytes(data.stats.bytes)}`
          : "Chat History"
      }
    >
      <List.EmptyView
        icon={Icon.Message}
        title="No Saved Conversations"
        description="Chats are encrypted locally and will appear here after your first question."
        actions={
          <ActionPanel>
            <Action.Push
              title="History Settings"
              icon={Icon.Gear}
              target={
                <HistorySettingsForm
                  onSaved={async () => void (await revalidate())}
                />
              }
            />
          </ActionPanel>
        }
      />
      {sessions.map((session) => (
        <List.Item
          key={session.id}
          icon={{ source: Icon.Message, tintColor: Color.Blue }}
          title={session.title}
          subtitle={`${session.providerName} · ${session.modelId}`}
          accessories={[
            { text: `${session.messageCount} messages` },
            { date: new Date(session.updatedAt) },
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Open Conversation"
                icon={Icon.Message}
                target={
                  <ConversationView
                    sessionId={session.id}
                    onChanged={async () => void (await revalidate())}
                  />
                }
              />
              <Action.Push
                title="History Settings"
                icon={Icon.Gear}
                target={
                  <HistorySettingsForm
                    onSaved={async () => void (await revalidate())}
                  />
                }
              />
              <Action
                title="Delete Conversation"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => void remove(session.id, session.title)}
              />
              <Action
                title="Delete All Conversations"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => void removeAll()}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
