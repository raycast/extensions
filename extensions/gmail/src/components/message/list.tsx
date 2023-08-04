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
  MessageShowDetailsAction,
} from "./actions";
import { getFirstValidLetter } from "../../lib/utils";

export function GMailMessageListItem(props: {
  message: gmail_v1.Schema$Message;
  onRevalidate?: () => void;
  showUnreadAccessory?: boolean;
  detailsShown?: boolean;
  onDetailsShownChanged?: (newValue: boolean) => void;
  allUnreadMessages?: gmail_v1.Schema$Message[];
}) {
  const data = props.message;
  const subject = () => {
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
  const detail = [`# ${subject()}`, internalDate?.toLocaleString(), data.snippet]
    .filter((e) => e && e.length > 0)
    .join("\n\n");
  return (
    <List.Item
      title={{ value: subject() || "", tooltip: props.detailsShown ? undefined : data.snippet }}
      subtitle={{
        value: fromParts && !props.detailsShown ? fromParts.name : undefined,
        tooltip: fromParts && !props.detailsShown ? fromParts.email : undefined,
      }}
      icon={data ? icon() : undefined}
      detail={
        <List.Item.Detail
          markdown={detail}
          metadata={
            <List.Item.Detail.Metadata>
              {internalDate && (
                <List.Item.Detail.Metadata.Label
                  title="Received"
                  text={internalDate?.toLocaleString()}
                  icon={Icon.Clock}
                />
              )}
              {fromParts?.name && (
                <List.Item.Detail.Metadata.Label title="From" text={fromParts.name} icon={Icon.Person} />
              )}
              {fromParts?.email && (
                <List.Item.Detail.Metadata.Label title="Address" text={fromParts.email} icon={Icon.Envelope} />
              )}
            </List.Item.Detail.Metadata>
          }
        />
      }
      accessories={[
        { icon: unreadIcon(), tooltip: unreadIcon() ? "Unread" : undefined },
        {
          date: !props.detailsShown ? internalDate : undefined,
          tooltip: !props.detailsShown ? internalDate?.toLocaleString() : undefined,
        },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <MessageOpenInBrowserAction message={data} onOpen={props.onRevalidate} />
            <MessageShowDetailsAction
              detailsShown={props.detailsShown === true ? true : false}
              onAction={props.onDetailsShownChanged}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <MessageMarkAsReadAction message={data} onRevalidate={props.onRevalidate} />
            <MessageMarkAllAsReadAction messages={props.allUnreadMessages} onRevalidate={props.onRevalidate} />
            <MessageMarkAsUnreadAction message={data} onRevalidate={props.onRevalidate} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <MessageDeleteAction message={data} onRevalidate={props.onRevalidate} />
          </ActionPanel.Section>
          <ActionPanel.Section>
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
