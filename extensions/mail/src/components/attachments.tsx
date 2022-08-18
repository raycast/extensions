import { List, Icon, Action, ActionPanel, Form, Color } from "@raycast/api";
import { useState, useEffect } from "react";
import { Message, Attachment } from "../types/types";
import * as attachmentUtils from "../scripts/attachments";
import { getAttachmentIcon } from "../utils/utils";

export const Attachments = (message: Message): JSX.Element => {
  const [attachments, setAttachments] = useState<Attachment[] | undefined>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const getAttachments = async () => {
      setAttachments(await attachmentUtils.getMessageAttachments(message));
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
                  await attachmentUtils.saveAttachment(message, attachment);
                }}
              />
              <Action
                title="Save All Attachments"
                icon={{ source: "../assets/icons/save.png", tintColor: Color.PrimaryText }}
                onAction={async () => {
                  await attachmentUtils.saveAllAttachments(message);
                }}
              />
              <Action.Push
                title="Save Attachment As..."
                shortcut={{ modifiers: ["cmd"], key: "s" }}
                icon={{ source: "../assets/icons/save-as.png", tintColor: Color.PrimaryText }}
                target={<SaveAttachment message={message} attachment={attachment} />}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
};

export const SaveAttachment = (props: { message: Message; attachment: Attachment }): JSX.Element => {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Attachment"
            onSubmit={async (values: { name: string }) => {
              attachmentUtils.saveAttachment(props.message, props.attachment, values.name);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Save As" autoFocus={true} placeholder={props.attachment.name} />
    </Form>
  );
};
