import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";

import { chatToPlainText, mentionNames } from "../helpers/chat-format";
import { messageUrl } from "../helpers/links";
import type { MentionRow } from "../helpers/my-mentions";
import { previewText } from "../helpers/my-messages";
import { senderName } from "../helpers/message-view";
import { conversationIcon, RefreshAction, ToggleUnreadOnlyAction } from "./ConversationItem";
import { OpenInChatAction } from "./OpenInChatAction";
import { ReplyForm } from "./ReplyForm";
import { SpaceMessages } from "./SpaceMessages";

interface MentionItemProps {
  row: MentionRow;
  /** The message is unread; undefined when that couldn't be checked (no dot). */
  unread?: boolean;
  /** Shown while the conversation is unread. */
  onMarkRead?: () => void;
  onSent?: () => void;
  onRefresh: () => void;
  unreadOnly: boolean;
  onToggleUnreadOnly: () => void;
}

/** One message that mentions the user, in My Messages' Mentions section. */
export function MentionItem(props: MentionItemProps) {
  const { row, unread } = props;
  const { message, item, names } = row;
  const link = messageUrl(item.space, message);
  const latest = message.createTime ? new Date(message.createTime) : undefined;

  const accessories: List.Item.Accessory[] = [];
  if (unread) accessories.push({ icon: { source: Icon.CircleFilled, tintColor: Color.Blue }, tooltip: "Unread" });
  if (message.threadReply) accessories.push({ icon: Icon.SpeechBubbleActive, tooltip: "Reply in a thread" });
  if (latest) accessories.push({ date: latest, tooltip: `Sent: ${latest.toLocaleString()}` });

  return (
    <List.Item
      title={item.title}
      subtitle={previewText(message, names, item.kind === "dm" ? item.title : undefined)}
      keywords={[senderName(message, names), "@", "mention", ...(item.email ? [item.email] : [])]}
      icon={conversationIcon(item)}
      accessories={accessories}
      actions={
        <ActionPanel title={item.title}>
          <ActionPanel.Section>
            <Action.Push title="View Messages" icon={Icon.Bubble} target={<SpaceMessages item={item} />} />
            <Action.Push
              title="Reply in Thread"
              icon={Icon.Reply}
              target={
                <ReplyForm
                  space={item.space}
                  spaceTitle={item.title}
                  message={message}
                  names={names}
                  onSent={props.onSent}
                />
              }
            />
            <OpenInChatAction url={link} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            {props.onMarkRead ? (
              <Action
                title="Mark Conversation as Read"
                icon={Icon.CheckCircle}
                shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                onAction={props.onMarkRead}
              />
            ) : null}
            <Action.CopyToClipboard
              title="Copy Text"
              content={chatToPlainText(message.text, mentionNames(message, names))}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
            <Action.CopyToClipboard title="Copy Link" content={link} shortcut={Keyboard.Shortcut.Common.CopyName} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <ToggleUnreadOnlyAction unreadOnly={props.unreadOnly} onToggle={props.onToggleUnreadOnly} />
            <RefreshAction onRefresh={props.onRefresh} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

/** Shown in place of the Mentions section when its search failed. */
export function MentionsErrorItem({ onRetry }: { onRetry: () => void }) {
  return (
    <List.Item
      title="Couldn't load mentions"
      icon={{ source: Icon.Warning, tintColor: Color.Orange }}
      actions={
        <ActionPanel>
          <Action title="Retry" icon={Icon.ArrowClockwise} onAction={onRetry} />
        </ActionPanel>
      }
    />
  );
}
