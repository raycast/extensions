import { Action, ActionPanel, Color, Icon, Image, List } from "@raycast/api";
import { GMailMessage, currentGMailAddress, getGMailMessageHeaderValue } from "../../lib/gmail";
import { useMessage } from "./hooks";
import { getAddressParts, isMailUnread } from "./utils";
import { gmail_v1 } from "@googleapis/gmail";
import { getAvatarIcon } from "@raycast/utils";
import { GMailMessageMarkAsReadAction, GMailMessageMarkAsUnreadAction, GMailRefreshAction } from "./actions";
import { getFirstValidLetter } from "../../lib/utils";

export function GMailMessageListItemLazy(props: { message: GMailMessage }) {
  const { data, isLoading, error } = useMessage(props.message);
  const title = () => {
    if (error) {
      return `Error: ${error}`;
    }
    if (isLoading) {
      return "...";
    }
    return "?";
  };
  if (!data) {
    return <List.Item title={title()} />;
  }
  return <GMailMessageListItemLazy message={data} />;
}

export function GMailMessageListItem(props: { message: gmail_v1.Schema$Message; onRevalidate?: () => void }) {
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
    if (!data) {
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
  const emailAddress = currentGMailAddress();
  const url =
    data && emailAddress ? `https://mail.google.com/mail/u/${emailAddress}/#inbox/${data.threadId}` : undefined;
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
            {url && (
              <Action.OpenInBrowser url={url} onOpen={() => (props.onRevalidate ? props.onRevalidate() : undefined)} />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <GMailMessageMarkAsReadAction message={data} onRevalidate={props.onRevalidate} />
            <GMailMessageMarkAsUnreadAction message={data} onRevalidate={props.onRevalidate} />
            <GMailRefreshAction onRevalidate={props.onRevalidate} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
