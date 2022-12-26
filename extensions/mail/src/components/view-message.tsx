import { useState, useEffect } from "react";
import { Detail, Icon } from "@raycast/api";
import * as messageScripts from "../scripts/messages";
import { MessageProps } from "../types/types";
import { Mailboxes } from "../utils/presets";
import { formatDate, formatMarkdown } from "../utils/utils";
import { MessageActions } from "./message-actions";

export const ViewMessage = (props: MessageProps): JSX.Element => {
  const { mailbox, message } = props;
  const [content, setContent] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      setContent(await messageScripts.getMessageContent(message, Mailboxes[mailbox].mailbox));
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
          <Detail.Metadata.Label title="From" text={message.senderName} icon={Icon.Person} />
          <Detail.Metadata.Label title="Received" text={formatDate(message.date)} icon={Icon.Calendar} />
        </Detail.Metadata>
      }
      actions={<MessageActions {...props} inMessageView={true} />}
    />
  );
};
