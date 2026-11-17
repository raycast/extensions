import { getAttachments } from "../scripts/attachments";
import { getMessageById } from "../scripts/messages";

type Input = {
  messageId: string;
  accountName?: string;
  mailboxName?: string;
};

export default async function (input: Input) {
  const { mailbox, message } = await getMessageById(input.messageId, {
    accountName: input.accountName,
    mailboxName: input.mailboxName,
  });
  const attachments = await getAttachments(message, mailbox);

  return {
    messageId: message.id,
    subject: message.subject,
    attachments,
  };
}
