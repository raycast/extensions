import { List, Action, ActionPanel, Form, Color } from "@raycast/api";
import { useState, useEffect } from "react";
import { Message, Attachment, Mailboxes } from "../types/types";
import * as attachmentUtils from "../scripts/attachments";
import { getAttachmentIcon } from "../utils/utils";

interface AttachmentProps {
  id: string;
  message: Message;
}

export const Attachments = (props: AttachmentProps): JSX.Element => {
  const [attachments, setAttachments] = useState<Attachment[] | undefined>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const getAttachments = async () => {
      setAttachments(await attachmentUtils.getMessageAttachments(props.message, Mailboxes[props.id].mailbox));
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
                  await attachmentUtils.saveAttachment(props.message, Mailboxes[props.id].mailbox, attachment);
                }}
              />
              <Action
                title="Save All Attachments"
                icon={{ source: "../assets/icons/save.png", tintColor: Color.PrimaryText }}
                onAction={async () => {
                  await attachmentUtils.saveAllAttachments(props.message, Mailboxes[props.id].mailbox);
                }}
              />
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

export const SaveAttachment = (props: AttachmentProps & { attachment: Attachment }): JSX.Element => {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Attachment"
            onSubmit={async (values: { name: string }) => {
              attachmentUtils.saveAttachment(props.message, Mailboxes[props.id].mailbox, props.attachment, values.name);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Save As" autoFocus={true} placeholder={props.attachment.name} />
    </Form>
  );
};
