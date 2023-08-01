import { Action, ActionPanel, Color, Icon, Image, List } from "@raycast/api";
import { GMailMessage, currentGMailAddress, getGMailMessageHeaderValue } from "../../lib/gmail";
import { useMessage } from "./hooks";
import { getTextIcon } from "../../lib/icons";
import { getAddressParts } from "./utils";

function firstValidLetter(text: string | undefined) {
  if (!text) {
    return;
  }
  for (const c of text) {
    if (c.match(/[a-zA-Z0-9]/)) {
      return c;
    }
  }
}

export function GMailMessageListItem(props: { message: GMailMessage }) {
  const { data, isLoading, error } = useMessage(props.message);
  const title = () => {
    if (error) {
      return `Error: ${error}`;
    }
    if (isLoading) {
      return "...";
    }
    const subject = getGMailMessageHeaderValue(data, "Subject");
    if (subject) {
      return subject;
    }
    return "?";
  };

  const unread = data?.labelIds ? data.labelIds.includes("UNREAD") : false;
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
  const textIcon = from ? getTextIcon(firstValidLetter(from) || "?") : undefined;
  const icon = () => {
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
