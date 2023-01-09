import { List, Action, ActionPanel, Form } from "@raycast/api";
import { useState, useEffect } from "react";
import * as attachmentUtils from "../scripts/attachments";
import { getAttachmentIcon } from "../utils/utils";
import { Mailbox, Message, Attachment } from "../types/types";
import { MailIcons } from "../utils/presets";

type AttachmentsProps = { mailbox: Mailbox; message: Message };

export const Attachments = (props: AttachmentsProps): JSX.Element => {
  const { mailbox, message } = props;
  const [attachments, setAttachments] = useState<Attachment[] | undefined>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      setAttachments(await attachmentUtils.getMessageAttachments(message, mailbox));
      setIsLoading(false);
    })();
    return () => {
      setAttachments([]);
    };
  }, []);

  return (
    <List isLoading={isLoading} navigationTitle="Message Attachments">
      {attachments?.map((attachment: Attachment) => (
        <List.Item
          key={attachment.id}
          id={attachment.id}
          title={attachment.name}
          accessories={[{ text: attachment.size }]}
          icon={getAttachmentIcon(attachment.type)}
          actions={
            <ActionPanel>
              <Action
                title={"Save Attachment"}
                icon={MailIcons.Save}
                onAction={async () => {
                  await attachmentUtils.saveAttachment(message, mailbox, attachment);
                }}
              />
              {attachments.length > 1 && (
                <Action
                  title={"Save All Attachments"}
                  icon={MailIcons.Save}
                  onAction={async () => {
                    await attachmentUtils.saveAllAttachments(message, mailbox);
                  }}
                />
              )}
              <Action.Push
                title={"Save Attachment As..."}
                shortcut={{ modifiers: ["cmd"], key: "s" }}
                icon={MailIcons.SaveAs}
                target={<SaveAttachment {...props} attachment={attachment} />}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
};

type SaveAttachmentProps = { mailbox: Mailbox; message: Message; attachment: Attachment };

export const SaveAttachment = ({ mailbox, message, attachment }: SaveAttachmentProps): JSX.Element => {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={"Save Attachment"}
            icon={MailIcons.Save}
            onSubmit={async (values: { name: string }) => {
              attachmentUtils.saveAttachment(message, mailbox, attachment, values.name);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Save As" autoFocus={true} placeholder={attachment.name} />
    </Form>
  );
};
