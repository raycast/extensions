import { List, Action, ActionPanel, Form, Color } from "@raycast/api";
import { useState, useEffect } from "react";
import * as attachmentUtils from "../scripts/attachments";
import { getAttachmentIcon } from "../utils/utils";
import { Message, Attachment } from "../types/types";
import { Mailboxes } from "../utils/presets";

interface AttachmentProps {
  mailbox: string;
  message: Message;
}

export const Attachments = (props: AttachmentProps): JSX.Element => {
  const { mailbox, message } = props;
  const [attachments, setAttachments] = useState<Attachment[] | undefined>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const getAttachments = async () => {
      setAttachments(await attachmentUtils.getMessageAttachments(message, Mailboxes[mailbox].mailbox));
      setIsLoading(false);
    };
    getAttachments();
    return () => {
      setAttachments([]);
    };
  }, []);

  return (
    <List isLoading={isLoading} navigationTitle="Message Attachments">
      {attachments?.map((attachment: Attachment, index: number) => (
        <List.Item
          key={index}
          id={index.toString()}
          title={attachment.name}
          accessories={[{ text: attachment.size }]}
          icon={getAttachmentIcon(attachment.type)}
          actions={
            <ActionPanel>
              <Action
                title="Save Attachment"
                icon={{ source: "../assets/icons/save.png", tintColor: Color.PrimaryText }}
                onAction={async () => {
                  await attachmentUtils.saveAttachment(message, Mailboxes[mailbox].mailbox, attachment);
                }}
              />
              {attachments.length > 1 && (
                <Action
                  title="Save All Attachments"
                  icon={{ source: "../assets/icons/save.png", tintColor: Color.PrimaryText }}
                  onAction={async () => {
                    await attachmentUtils.saveAllAttachments(message, Mailboxes[mailbox].mailbox);
                  }}
                />
              )}
              <Action.Push
                title="Save Attachment As..."
                shortcut={{ modifiers: ["cmd"], key: "s" }}
                icon={{ source: "../assets/icons/save-as.png", tintColor: Color.PrimaryText }}
                target={<SaveAttachment {...props} attachment={attachment} />}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
};

type SaveAttachmentProps = AttachmentProps & { attachment: Attachment };

export const SaveAttachment = ({ mailbox, message, attachment }: SaveAttachmentProps): JSX.Element => {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Attachment"
            onSubmit={async (values: { name: string }) => {
              attachmentUtils.saveAttachment(message, Mailboxes[mailbox].mailbox, attachment, values.name);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Save As" autoFocus={true} placeholder={attachment.name} />
    </Form>
  );
};
