import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { Conversation, listConversations } from "./lib/contra";

const INBOX_URL = "https://contra.com/inbox";

export default function Command() {
  const { data, isLoading, revalidate } = useCachedPromise(
    async () => listConversations(),
    [],
    {
      onError: (e) => {
        showFailureToast(e, { title: "Failed to load messages" });
      },
    },
  );

  const conversations = data?.conversations ?? [];
  const unread = conversations.filter((c) => c.unreadMessageCount > 0);
  const read = conversations.filter((c) => c.unreadMessageCount === 0);

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Contra Messages"
      searchBarPlaceholder="Search conversations…"
    >
      <List.Section title="Unread" subtitle={`${data?.totalUnread ?? 0}`}>
        {unread.map((c) => (
          <ConversationItem
            key={c.chatConversationId}
            conversation={c}
            onRefresh={revalidate}
          />
        ))}
      </List.Section>
      <List.Section title="All Conversations" subtitle={`${read.length}`}>
        {read.map((c) => (
          <ConversationItem
            key={c.chatConversationId}
            conversation={c}
            onRefresh={revalidate}
          />
        ))}
      </List.Section>
    </List>
  );
}

function ConversationItem({
  conversation,
  onRefresh,
}: {
  conversation: Conversation;
  onRefresh: () => void;
}) {
  const unread = conversation.unreadMessageCount > 0;
  const latest = conversation.latestMessage;
  const accessories: List.Item.Accessory[] = [];
  if (unread) {
    accessories.push({
      tag: {
        value: `${conversation.unreadMessageCount} new`,
        color: Color.Red,
      },
    });
  }
  if (latest) accessories.push({ date: new Date(latest.createdAt) });

  return (
    <List.Item
      icon={{
        source: unread ? Icon.Dot : Icon.SpeechBubble,
        tintColor: unread ? Color.Red : Color.SecondaryText,
      }}
      title={conversation.title}
      subtitle={
        latest
          ? `${latest.author.fullName ?? "?"}: ${latest.bodyPlaintext}`.slice(
              0,
              80,
            )
          : undefined
      }
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={INBOX_URL} title="Open Inbox" />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={onRefresh}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel>
      }
    />
  );
}
