import { useState } from "react";
import { List, Action, ActionPanel, Form, showHUD, popToRoot } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import * as attachmentUtils from "../scripts/attachments";
import { getAttachmentIcon } from "../utils";
import { Mailbox, Message, Attachment } from "../types";
import { MailIcons } from "../utils/presets";

type AttachmentsProps = { mailbox: Mailbox; message: Message };

export const Attachments = (props: AttachmentsProps): JSX.Element => {
  const { mailbox, message } = props;

  const { data: attachments, isLoading: isLoadingAttachments } = useCachedPromise(
    attachmentUtils.getMessageAttachments,
    [message, mailbox]
  );

  const [isSavingAttachments, setIsSavingAttachments] = useState(false);

  return (
    <List isLoading={isLoadingAttachments || isSavingAttachments} navigationTitle="Message Attachments">
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
                  try {
                    setIsSavingAttachments(true);
                    await attachmentUtils.saveAttachment(message, mailbox, attachment);
                  } finally {
                    setIsSavingAttachments(false);
                  }
                }}
              />

              {attachments.length > 1 && (
                <Action
                  title={"Save All Attachments"}
                  icon={MailIcons.Save}
                  onAction={async () => {
                    try {
                      setIsSavingAttachments(true);
                      await attachmentUtils.saveAllAttachments(message, mailbox);
                    } finally {
                      setIsSavingAttachments(false);
                    }
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
  const [isSavingAttachment, setIsSavingAttachment] = useState(false);

  return (
    <Form
      isLoading={isSavingAttachment}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={"Save Attachment"}
            icon={MailIcons.Save}
            onSubmit={async (values: { name: string }) => {
              try {
                setIsSavingAttachment(true);
                await attachmentUtils.saveAttachment(message, mailbox, attachment, values.name);
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
      <Form.TextField id="name" title="Save As" autoFocus={true} placeholder={attachment.name} />
    </Form>
  );
};
