import { Detail, Icon, Color } from "@raycast/api";
import { format } from "date-fns";

import { getAttachmentType } from "../helpers";
import { Message } from "../hooks/useMessages";

import MessageActions from "./MessageActions";

type DetailsProps = {
  message: Message;
};

export default function Details({ message }: DetailsProps): React.JSX.Element {
  const attachmentType = getAttachmentType(message);
  const date = new Date(message.date);

  return (
    <Detail
      navigationTitle={`Message from ${message.senderName}`}
      markdown={`${message.attachment_name ? `\n\n![Attachment](${message.attachment_filename})` : ""}\n${message.body}`.trim()}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Sender" text={message.senderName} icon={message.avatar} />
          <Detail.Metadata.Label title="Date" text={format(date, "PPpp")} icon={Icon.Calendar} />
          <Detail.Metadata.Label
            title="Status"
            text={message.is_read ? "Read" : "Unread"}
            icon={message.is_read ? { source: Icon.Check, tintColor: Color.Green } : Icon.Circle}
          />
          {attachmentType && (
            <Detail.Metadata.Label title="Attachment" text={attachmentType.text} icon={attachmentType.icon} />
          )}
        </Detail.Metadata>
      }
      actions={<MessageActions message={message} showDetails={false} />}
    />
  );
}
