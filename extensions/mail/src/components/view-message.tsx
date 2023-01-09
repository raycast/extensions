import { useState, useEffect } from "react";
import { Color, Detail, Icon, Image } from "@raycast/api";
import * as messageScripts from "../scripts/messages";
import { MessageProps } from "../types/types";
import { formatDate, formatMarkdown } from "../utils/utils";
import { MessageActions } from "./message-actions";
import { MailIcons } from "../utils/presets";

export const ViewMessage = (props: MessageProps): JSX.Element => {
  const { mailbox, message } = props;
  const [content, setContent] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      setContent(await messageScripts.getMessageContent(message, mailbox));
      setIsLoading(false);
    })();
    return () => {
      setContent(undefined);
    };
  }, []);

  return (
    <Detail
      isLoading={isLoading}
      markdown={!isLoading ? formatMarkdown(message.subject, content) : undefined}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="From" text={message.senderName} icon={Icon.PersonCircle} />
          <Detail.Metadata.Label
            title="Address"
            text={message.senderAddress}
            icon={{ source: "../assets/icons/envelope.svg", tintColor: Color.SecondaryText }}
          />
          <Detail.Metadata.Label
            title="Attachments"
            text={message.numAttachments > 0 ? message.numAttachments.toString() : "None"}
            icon={Icon.Paperclip}
          />
          <Detail.Metadata.Label title="Received" text={formatDate(message.date)} icon={Icon.Calendar} />
        </Detail.Metadata>
      }
      actions={<MessageActions {...props} inMessageView={true} />}
    />
  );
};
