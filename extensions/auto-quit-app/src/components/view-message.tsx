import { Color, Detail, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import * as messageScripts from "../scripts/messages";
import { MessageProps } from "../types";
import { formatDate, formatMarkdown } from "../utils";
import { MessageActions } from "./message-actions";

export const ViewMessage = (props: MessageProps): JSX.Element => {
  const { mailbox, message } = props;

  const { data: content, isLoading: isLoadingContent } = useCachedPromise(messageScripts.getMessageContent, [
    message,
    mailbox,
  ]);

  return (
    <Detail
      isLoading={isLoadingContent}
      markdown={!isLoadingContent ? formatMarkdown(message.subject, content) : undefined}
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
