import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { Chat, ChatMessage, ChatTopic } from "../services/telegram-client";
import { groupMessagesByDate } from "../utils/message";
import { buildMarkdownWithMedia } from "../utils/markdown";
import { getMediaDisplayTitle } from "../utils/media";
import { SendMessageForm } from "./send-message-form";
import { RefreshAction } from "./actions";

interface ChatConversationViewProps {
  chat: Chat;
  topic?: ChatTopic;
  messages: ChatMessage[];
  isLoading: boolean;
  onRefresh: () => void;
  onShowCompactList: () => void;
}

function senderName(message: ChatMessage, chat: Chat): string {
  return message.isOutgoing ? "You" : message.senderName || chat.title;
}

function messageMarkdown(message: ChatMessage): string {
  let body = buildMarkdownWithMedia({ text: message.text, media: message.media });

  if (message.media && !["photo", "image"].includes(message.media.type)) {
    const attachment = message.media.fileName || `${getMediaDisplayTitle(message.media.type)} attachment`;
    body = body ? `${body}\n\n_📎 ${attachment}_` : `_📎 ${attachment}_`;
  }

  return body || "_Empty message_";
}

function quoteMarkdown(markdown: string): string {
  return markdown
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
}

function buildConversationMarkdown(messages: ChatMessage[], chat: Chat): string {
  const lines = [`_${messages.length} recent messages · oldest to newest_`];
  const groupedMessages = groupMessagesByDate(messages);

  for (const [date, dateMessages] of groupedMessages.entries()) {
    lines.push(`\n### ${date}`);

    for (const message of dateMessages) {
      const sender = senderName(message, chat);
      const time = message.date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
      const body = messageMarkdown(message);

      if (message.isOutgoing) {
        lines.push(`\n> **${sender}** · _${time}_\n>\n${quoteMarkdown(body)}`);
      } else {
        lines.push(`\n**${sender}** · _${time}_\n\n${body}`);
      }
    }
  }

  return lines.join("\n");
}

function buildPlainTranscript(messages: ChatMessage[], chat: Chat): string {
  return messages
    .map((message) => {
      const sender = senderName(message, chat);
      const timestamp = message.date.toLocaleString();
      const attachment = message.media
        ? ` [${message.media.fileName || getMediaDisplayTitle(message.media.type)}]`
        : "";
      return `[${timestamp}] ${sender}: ${message.text}${attachment}`;
    })
    .join("\n");
}

export function ChatConversationView({
  chat,
  topic,
  messages,
  isLoading,
  onRefresh,
  onShowCompactList,
}: ChatConversationViewProps) {
  const destination = topic ? `${chat.title} · ${topic.title}` : chat.title;
  const markdown =
    messages.length > 0
      ? buildConversationMarkdown(messages, chat)
      : isLoading
        ? "# Loading Conversation…"
        : "# No Messages\n\nThis conversation has no messages yet.";

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={destination}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.Push
            icon={Icon.Pencil}
            title="Send Message"
            target={<SendMessageForm chat={chat} topic={topic} onSuccess={onRefresh} />}
          />
          <Action icon={Icon.List} title="Show Message List" onAction={onShowCompactList} />
          {messages.length > 0 ? (
            <Action.CopyToClipboard title="Copy Conversation" content={buildPlainTranscript(messages, chat)} />
          ) : null}
          <RefreshAction onRefresh={onRefresh} />
        </ActionPanel>
      }
    />
  );
}
