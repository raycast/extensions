import { useState } from "react";
import { List, Action, ActionPanel, Form, showHUD, popToRoot } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

import { Mailbox, Message, Attachment } from "../types";
import { getAttachments, saveAttachment, saveAllAttachments } from "../scripts/attachments";
import { getIconByType } from "../utils";
import { MailIcon } from "../utils/presets";

export type AttachmentListProps = {
  mailbox: Mailbox;
  message: Message;
};

export const AttachmentList = (props: AttachmentListProps) => {
  const { mailbox, message } = props;

  const { data: attachments, isLoading: isLoadingAttachments } = useCachedPromise(getAttachments, [message, mailbox]);

  const [isSavingAttachments, setIsSavingAttachments] = useState(false);

  return (
    <List isLoading={isLoadingAttachments || isSavingAttachments} navigationTitle="Message Attachments">
      {attachments?.map((attachment: Attachment) => (
        <List.Item
          key={attachment.id}
          id={attachment.id}
          title={attachment.name}
          accessories={[{ text: attachment.size }]}
          icon={getIconByType(attachment.type)}
          actions={
            <ActionPanel>
              <Action
                title={"Save Attachment"}
                icon={MailIcon.Save}
                onAction={async () => {
                  try {
                    setIsSavingAttachments(true);
                    await saveAttachment(message, mailbox, attachment);
                  } finally {
                    setIsSavingAttachments(false);
                  }
                }}
              />

              {attachments.length > 1 && (
                <Action
                  title={"Save All Attachments"}
                  icon={MailIcon.Save}
                  onAction={async () => {
                    try {
                      setIsSavingAttachments(true);
                      await saveAllAttachments(message, mailbox);
                    } finally {
                      setIsSavingAttachments(false);
                    }
                  }}
                />
              )}

              <Action.Push
                title={"Save Attachment As…"}
                shortcut={{ modifiers: ["cmd"], key: "s" }}
                icon={MailIcon.SaveAs}
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

const SaveAttachment = ({ mailbox, message, attachment }: SaveAttachmentProps) => {
  const [isSavingAttachment, setIsSavingAttachment] = useState(false);

  return (
    <Form
      isLoading={isSavingAttachment}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={"Save Attachment"}
            icon={MailIcon.Save}
            onSubmit={async (values: { name: string }) => {
              try {
                setIsSavingAttachment(true);
                await saveAttachment(message, mailbox, attachment, values.name);
                await showHUD("Attachment Saved");
                await popToRoot();
              } finally {
                setIsSavingAttachment(false);
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Filename" autoFocus={true} placeholder={attachment.name} />
    </Form>
  );
};
