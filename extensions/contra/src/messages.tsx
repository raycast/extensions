import { Action, ActionPanel, Color, Icon, List, Keyboard } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import {
  Conversation,
  getConversationUrl,
  listConversations,
} from "./lib/contra";

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
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={revalidate}
            shortcut={Keyboard.Shortcut.Common.Refresh}
          />
        </ActionPanel>
      }
    >
      <List.Section title="Unread" subtitle={`${data?.totalUnread ?? 0}`}>
        {unread.map((c) => (
          <ConversationItem key={c.chatConversationId} conversation={c} />
        ))}
      </List.Section>
      <List.Section title="All Conversations" subtitle={`${read.length}`}>
        {read.map((c) => (
          <ConversationItem key={c.chatConversationId} conversation={c} />
        ))}
      </List.Section>
    </List>
  );
}

function ConversationItem({ conversation }: { conversation: Conversation }) {
  const unread = conversation.unreadMessageCount > 0;
  const latest = conversation.latestMessage;
  const conversationUrl = getConversationUrl(conversation);
  const accessories: List.Item.Accessory[] = [];
  if (unread) {
    accessories.push({
      tag: {
        value: `${conversation.unreadMessageCount} new`,
        color: Color.Red,
      },
    });
  }
  if (!conversationUrl) {
    accessories.push({
      tag: { value: "Inbox only", color: Color.SecondaryText },
      tooltip:
        "Contra's API does not expose per-conversation links — opens your inbox",
    });
  }
  if (latest) accessories.push({ date: new Date(latest.createdAt) });

  const latestPreview = latest
    ? truncateWords(
        `${latest.author.fullName ?? "?"}: ${latest.bodyPlaintext}`,
        80,
      )
    : undefined;

  return (
    <List.Item
      icon={{
        source: unread ? Icon.Dot : Icon.SpeechBubble,
        tintColor: unread ? Color.Red : Color.SecondaryText,
      }}
      title={conversation.title}
      subtitle={latestPreview}
      accessories={accessories}
      actions={
        <ActionPanel>
          {conversationUrl ? (
            <>
              <Action.OpenInBrowser
                url={conversationUrl}
                title="Open Conversation"
              />
              <Action.OpenInBrowser url={INBOX_URL} title="Open Inbox" />
            </>
          ) : (
            <Action.OpenInBrowser
              url={INBOX_URL}
              title="Open Inbox"
              shortcut={Keyboard.Shortcut.Common.Open}
            />
          )}
        </ActionPanel>
      }
    />
  );
}

function truncateWords(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const slice = text.slice(0, maxLength);
  const lastSpace = slice.lastIndexOf(" ");
  const trimmed = lastSpace > 0 ? slice.slice(0, lastSpace) : slice;
  return `${trimmed}…`;
}
