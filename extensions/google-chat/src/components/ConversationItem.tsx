import { Action, ActionPanel, Color, Icon, Image, Keyboard, List } from "@raycast/api";
import { getAvatarIcon } from "@raycast/utils";

import type { Message, SpaceItem } from "../api/types";
import type { UserNames } from "../helpers/chat-format";
import { spaceUrl } from "../helpers/links";
import { previewText } from "../helpers/my-messages";
import { OpenInChatAction } from "./OpenInChatAction";
import { SendMessageAction } from "./SpaceActions";
import { SpaceMessages } from "./SpaceMessages";

function conversationIcon(item: SpaceItem): Image.ImageLike {
  if (item.avatarUrl) return { source: item.avatarUrl, mask: Image.Mask.Circle };
  if (item.kind === "dm") return getAvatarIcon(item.title);
  return item.kind === "group" ? Icon.TwoPeople : Icon.SpeechBubble;
}

interface ConversationItemProps {
  item: SpaceItem;
  /** Newest message from someone else (the newest unread one in the Unread section). */
  preview?: Message;
  names: UserNames;
  youReplied: boolean;
  /** Time of the newest message in the conversation. */
  latest?: Date;
  /** Unread messages from others; no tag when 0. */
  unreadCount?: number;
  mentioned?: boolean;
  /** Shown on unread rows only. */
  onMarkRead?: () => void;
  /** Shown while anything is unread. */
  onMarkAllRead?: () => void;
  onSent?: () => void;
  onRefresh: () => void;
  unreadOnly: boolean;
  onToggleUnreadOnly: () => void;
}

/** One conversation in My Messages, like a row in Google Chat's Home. */
export function ConversationItem(props: ConversationItemProps) {
  const { item, preview, names, youReplied, latest, unreadCount = 0, mentioned } = props;
  const url = spaceUrl(item.space);
  const subtitle = preview ? previewText(preview, names, item.kind === "dm" ? item.title : undefined) : undefined;

  const accessories: List.Item.Accessory[] = [];
  if (preview?.threadReply) accessories.push({ icon: Icon.SpeechBubbleActive, tooltip: "Reply in a thread" });
  if (youReplied) accessories.push({ icon: Icon.Reply, tooltip: "You replied" });
  if (mentioned) accessories.push({ tag: { value: "@", color: Color.Red }, tooltip: "Mentions you" });
  if (unreadCount > 0) {
    accessories.push({ tag: { value: `${unreadCount}`, color: Color.Blue }, tooltip: `${unreadCount} unread` });
  }
  if (latest) accessories.push({ date: latest, tooltip: `Latest message: ${latest.toLocaleString()}` });

  return (
    <List.Item
      title={item.title}
      subtitle={subtitle}
      keywords={[...(item.email ? [item.email] : []), ...(mentioned ? ["@", "mention"] : [])]}
      icon={conversationIcon(item)}
      accessories={accessories}
      actions={
        <ActionPanel title={item.title}>
          <ActionPanel.Section>
            <Action.Push title="View Messages" icon={Icon.Bubble} target={<SpaceMessages item={item} />} />
            <OpenInChatAction url={url} />
            <SendMessageAction item={item} onSent={props.onSent} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            {props.onMarkRead ? (
              <Action
                title="Mark as Read"
                icon={Icon.CheckCircle}
                shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                onAction={props.onMarkRead}
              />
            ) : null}
            {props.onMarkAllRead ? (
              <Action
                title="Mark All as Read"
                icon={Icon.CheckList}
                shortcut={{ modifiers: ["cmd", "shift", "opt"], key: "r" }}
                onAction={props.onMarkAllRead}
              />
            ) : null}
            <Action.CopyToClipboard title="Copy Link" content={url} shortcut={Keyboard.Shortcut.Common.Copy} />
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

/** Switches between All and Unread only (⌘U). */
export function ToggleUnreadOnlyAction({ unreadOnly, onToggle }: { unreadOnly: boolean; onToggle: () => void }) {
  return (
    <Action
      title="Toggle Unread Only"
      icon={unreadOnly ? Icon.List : Icon.Filter}
      shortcut={{ modifiers: ["cmd"], key: "u" }}
      onAction={onToggle}
    />
  );
}

/** Reloads unread and the conversation list (⌘R). */
export function RefreshAction({ onRefresh }: { onRefresh: () => void }) {
  return (
    <Action
      title="Refresh"
      icon={Icon.ArrowClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={onRefresh}
    />
  );
}
