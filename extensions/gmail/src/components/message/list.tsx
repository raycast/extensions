import { ActionPanel, Color, Icon, Image, List } from "@raycast/api";
import { getGMailMessageHeaderValue } from "../../lib/gmail";
import { getAddressParts, isMailUnread } from "./utils";
import { gmail_v1 } from "@googleapis/gmail";
import { getAvatarIcon } from "@raycast/utils";
import {
  MessageMarkAsReadAction,
  MessageMarkAsUnreadAction,
  MessagesRefreshAction,
  MessageCopyIdAction,
  MessageOpenInBrowserAction,
  MessageDeleteAction,
  MessageMarkAllAsReadAction,
} from "./actions";
import { getFirstValidLetter } from "../../lib/utils";

export function GMailMessageListItem(props: {
  message: gmail_v1.Schema$Message;
  onRevalidate?: () => void;
  showUnreadAccessory?: boolean;
  allUnreadMessages?: gmail_v1.Schema$Message[];
}) {
  const data = props.message;
  const title = () => {
    const subject = getGMailMessageHeaderValue(data, "Subject");
    if (subject) {
      return subject;
    }
    return "<No Subject>";
  };

  const unread = isMailUnread(data);
  const unreadIcon = (): Image.ImageLike | undefined => {
    if (!data || props.showUnreadAccessory === false) {
      return;
    }
    const src = unread === true ? "envelope-closed.svg" : undefined;
    if (!src) {
      return;
    }
    return { source: Icon.Stars, tintColor: Color.Yellow };
  };

  const from = getGMailMessageHeaderValue(data, "From");
  const fromParts = getAddressParts(from);
  const icon = () => {
    const textIcon = getAvatarIcon(getFirstValidLetter(from, "?") || "");
    if (textIcon) {
      return textIcon;
    }
    return Icon.Envelope;
  };

  const internalDate = data?.internalDate ? new Date(parseInt(data.internalDate)) : undefined;
  return (
    <List.Item
      title={title()}
      subtitle={{ value: fromParts ? fromParts.name : undefined, tooltip: fromParts ? fromParts.email : undefined }}
      icon={data ? icon() : undefined}
      accessories={[
        { icon: unreadIcon(), tooltip: unreadIcon() ? "Unread" : undefined },
        { date: internalDate, tooltip: internalDate?.toISOString() },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <MessageOpenInBrowserAction message={data} onOpen={props.onRevalidate} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <MessageMarkAsReadAction message={data} onRevalidate={props.onRevalidate} />
            <MessageMarkAllAsReadAction messages={props.allUnreadMessages} onRevalidate={props.onRevalidate} />
            <MessageMarkAsUnreadAction message={data} onRevalidate={props.onRevalidate} />
            <MessageDeleteAction message={data} onRevalidate={props.onRevalidate} />
            <MessagesRefreshAction onRevalidate={props.onRevalidate} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <MessageCopyIdAction message={data} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
