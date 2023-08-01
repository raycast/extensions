import { Action, ActionPanel, Color, Icon, Image, List } from "@raycast/api";
import { GMailMessage, currentGMailAddress, getGMailMessageHeaderValue } from "../../lib/gmail";
import { useMessage } from "./hooks";
import { getAddressParts, isMailUnread } from "./utils";
import { gmail_v1 } from "@googleapis/gmail";
import { getAvatarIcon } from "@raycast/utils";

function firstValidLetter(text: string | null | undefined, fallback?: string) {
  if (!text) {
    return;
  }
  for (const c of text) {
    if (c.match(/[a-zA-Z0-9]/)) {
      return c;
    }
  }
  return fallback;
}

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
    return null;
  }
  return <GMailMessageListItemLazy message={data} />;
}

export function GMailMessageListItem(props: { message: gmail_v1.Schema$Message }) {
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
    const textIcon = getAvatarIcon(firstValidLetter(from, "?") || "");
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
      actions={<ActionPanel>{url && <Action.OpenInBrowser url={url} />}</ActionPanel>}
    />
  );
}
