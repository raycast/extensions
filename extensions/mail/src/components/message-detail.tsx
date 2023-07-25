import { Color, Detail, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

import { MessageActions } from "./message-actions";
import { MessageProps } from "../types";
import { getMessageMarkdown } from "../scripts/messages";
import { isValidDate, toRelative } from "../utils";

export const MessageDetail = (props: MessageProps) => {
  const { mailbox, message } = props;

  const { data: markdown, isLoading: isLoadingContent } = useCachedPromise(getMessageMarkdown, [message, mailbox]);

  return (
    <Detail
      isLoading={isLoadingContent}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="From" text={message.senderName} icon={Icon.PersonCircle} />

          <Detail.Metadata.Label
            title="Address"
            text={message.senderAddress}
            icon={{ source: "../assets/icons/envelope.svg", tintColor: Color.SecondaryText }}
          />

          {message.numAttachments > 0 && (
            <Detail.Metadata.Label
              title="Attachments"
              text={message.numAttachments > 0 ? message.numAttachments.toString() : "None"}
              icon={Icon.Paperclip}
            />
          )}

          {isValidDate(message.date) && (
            <Detail.Metadata.Label title="Received" text={toRelative(message.date)} icon={Icon.Calendar} />
          )}
        </Detail.Metadata>
      }
      actions={<MessageActions {...props} inMessageView={true} />}
    />
  );
};
