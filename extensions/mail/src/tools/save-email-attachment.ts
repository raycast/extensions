import type { Tool } from "@raycast/api";

import { getAttachmentSaveDirectory, getAttachments, saveAttachment } from "../scripts/attachments";
import { getMessageById } from "../scripts/messages";
import type { Attachment, Mailbox, Message } from "../types";

type Input = {
  messageId: string;
  attachmentId: string;
  accountName?: string;
  mailboxName?: string;
};

async function getContext(input: Input): Promise<{ message: Message; mailbox: Mailbox; attachment: Attachment }> {
  const { mailbox, message } = await getMessageById(input.messageId, {
    accountName: input.accountName,
    mailboxName: input.mailboxName,
  });
  const attachments = await getAttachments(message, mailbox);
  const attachment = attachments.find((candidate) => candidate.id === input.attachmentId);

  if (!attachment) {
    throw new Error(`Attachment "${input.attachmentId}" was not found on message ${message.id}`);
  }

  return { message, mailbox, attachment };
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const { message, attachment } = await getContext(input);

  return {
    message: "Save this email attachment?",
    info: [
      { name: "Email", value: message.subject },
      { name: "Attachment", value: attachment.name },
      { name: "Size", value: attachment.size },
      { name: "Save To", value: getAttachmentSaveDirectory() },
    ],
  };
};

export default async function (input: Input) {
  const { message, mailbox, attachment } = await getContext(input);
  const path = await saveAttachment(message, mailbox, attachment, undefined, { silent: true });

  if (!path) {
    throw new Error(`Failed to save attachment "${attachment.name}"`);
  }

  return {
    message: "Attachment saved",
    messageId: message.id,
    attachment: attachment.name,
    path,
  };
}
