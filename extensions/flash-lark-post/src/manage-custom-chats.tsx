import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Alert,
  confirmAlert,
  Icon,
  Color,
  Detail,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { CustomChatManager, CustomChat } from "./custom-chats";
import AddCustomChat from "./add-custom-chat";

export default function ManageCustomChats() {
  const [customChats, setCustomChats] = useState<CustomChat[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadCustomChats = async () => {
    try {
      const chats = await CustomChatManager.getCustomChats();
      setCustomChats(chats);
    } catch (error) {
      console.error("Failed to load custom chats:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "エラー",
        message: "カスタムチャットの読み込みに失敗しました",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCustomChats();
  }, []);

  const handleDelete = async (chat: CustomChat) => {
    const confirmed = await confirmAlert({
      title: "チャットを削除",
      message: `「${chat.name}」を削除しますか？この操作は取り消せません。`,
      primaryAction: {
        title: "削除",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        await CustomChatManager.deleteCustomChat(chat.id);
        await showToast({
          style: Toast.Style.Success,
          title: "削除完了",
          message: `「${chat.name}」を削除しました`,
        });
        await loadCustomChats();
      } catch (error) {
        console.error("Failed to delete custom chat:", error);
        await showToast({
          style: Toast.Style.Failure,
          title: "エラー",
          message: "チャットの削除に失敗しました",
        });
      }
    }
  };

  const handleChatAdded = () => {
    loadCustomChats();
  };

  const getChatIcon = (type: CustomChat["type"]) => {
    switch (type) {
      case "group":
        return { source: Icon.TwoPeople, tintColor: Color.Blue };
      case "personal":
        return { source: Icon.Person, tintColor: Color.Green };
      case "webhook":
        return { source: Icon.Bot, tintColor: Color.Orange };
      default:
        return Icon.Message;
    }
  };

  const getChatTypeLabel = (type: CustomChat["type"]) => {
    switch (type) {
      case "group":
        return "グループチャット";
      case "personal":
        return "個人チャット";
      case "webhook":
        return "カスタムボット";
      default:
        return "不明";
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="カスタムチャットを検索..."
      actions={
        <ActionPanel>
          <Action.Push
            title="新しいチャットを追加"
            icon={Icon.Plus}
            target={<AddCustomChat onChatAdded={handleChatAdded} />}
          />
        </ActionPanel>
      }
    >
      {customChats.length === 0 ? (
        <List.EmptyView
          icon={Icon.Message}
          title="カスタムチャットがありません"
          description="新しいチャットを追加して、送信先を増やしましょう"
          actions={
            <ActionPanel>
              <Action.Push
                title="新しいチャットを追加"
                icon={Icon.Plus}
                target={<AddCustomChat onChatAdded={handleChatAdded} />}
              />
            </ActionPanel>
          }
        />
      ) : (
        customChats.map((chat) => (
          <List.Item
            key={chat.id}
            title={chat.name}
            subtitle={getChatTypeLabel(chat.type)}
            icon={getChatIcon(chat.type)}
            accessories={[{ text: formatDate(chat.updatedAt) }]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="詳細を表示"
                  icon={Icon.Eye}
                  target={<ChatDetail chat={chat} />}
                />
                <Action.Push
                  title="新しいチャットを追加"
                  icon={Icon.Plus}
                  target={<AddCustomChat onChatAdded={handleChatAdded} />}
                />
                <ActionPanel.Section>
                  <Action
                    title="削除"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd"], key: "delete" }}
                    onAction={() => handleDelete(chat)}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function ChatDetail({ chat }: { chat: CustomChat }) {
  const markdown = `
# ${chat.name}

**タイプ:** ${chat.type === "group" ? "グループチャット" : chat.type === "personal" ? "個人チャット" : "カスタムボット"}

${chat.chatId ? `**チャットID:** \`${chat.chatId}\`` : ""}
${chat.webhookUrl ? `**Webhook URL:** \`${chat.webhookUrl}\`` : ""}

${chat.description ? `**説明:**\n${chat.description}` : ""}

---

**作成日時:** ${new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(chat.createdAt)}

**更新日時:** ${new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(chat.updatedAt)}
  `;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="チャットIDをコピー"
            content={chat.chatId || chat.webhookUrl || ""}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}
