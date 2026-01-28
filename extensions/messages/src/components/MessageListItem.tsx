import { Color, Icon, List } from "@raycast/api";
import { format } from "date-fns";

import { getAttachmentType } from "../helpers";
import { Message } from "../hooks/useMessages";

import MessageActions from "./MessageActions";

type MessageListItemProps = {
  message: Message;
  mutate: () => void;
};

export default function MessageListItem({ message, mutate }: MessageListItemProps) {
  const attachmentType = getAttachmentType(message);

  const date = new Date(message.date);

  const accessories = [
    {
      icon: attachmentType?.icon,
      tooltip: attachmentType?.text,
    },
    {
      icon: message.is_read ? { source: Icon.Check, tintColor: Color.Green } : Icon.Circle,
      tooltip: message.is_read
        ? `Read ${message.date_read ? format(new Date(message.date_read), "PPpp") : ""}`
        : "Unread",
    },
    { date, tooltip: format(date, "PPpp") },
  ];

  let subtitle: string;
  if (message.attachment_name) {
    subtitle = `(${message.attachment_name}) ${message.body}`;
  } else {
    subtitle = message.body;
  }

  return (
    <List.Item
      title={message.senderName}
      icon={message.avatar}
      subtitle={subtitle}
      accessories={accessories}
      {...(message.attachment_filename && {
        quickLook: {
          path: message.attachment_filename,
          name: message.attachment_name,
        },
      })}
      actions={<MessageActions message={message} mutate={mutate} />}
    />
  );
}
