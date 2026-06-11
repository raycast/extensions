import { moveMessageToTrashById } from "../scripts/messages";

type Input = {
  /**
   * The numeric message ids of the emails to move to Trash.
   *
   * Use the `search-emails` tool first to find emails and get their ids.
   */
  messageIds?: string[];

  /**
   * The numeric message id of a single email to move to Trash.
   *
   * Use `messageIds` when moving multiple emails.
   */
  messageId?: string;

  /**
   * Optional Apple Mail account name to narrow the lookup.
   *
   * Use this only when you already know which account contains the message.
   */
  accountName?: string;

  /**
   * Optional Apple Mail mailbox name to narrow the lookup.
   *
   * Use this only when you already know which mailbox contains the message.
   */
  mailboxName?: string;
};

const getMessageIds = (input: Input): string[] => {
  const messageIds = input.messageIds?.length ? input.messageIds : input.messageId ? [input.messageId] : [];
  return [...new Set(messageIds.map((messageId) => messageId.trim()).filter(Boolean))];
};

export default async function (input: Input) {
  const messageIds = getMessageIds(input);

  if (messageIds.length === 0) {
    throw new Error("At least one message id is required");
  }

  try {
    const movedEmails = [];

    for (const messageId of messageIds) {
      const { account, mailbox, message } = await moveMessageToTrashById(messageId, {
        accountName: input.accountName,
        mailboxName: input.mailboxName,
        silent: true,
      });

      movedEmails.push({
        id: message.id,
        subject: message.subject,
        from: message.senderAddress,
        accountName: account.name,
        mailboxName: mailbox.name,
      });
    }

    const emailLabel = movedEmails.length === 1 ? "Email" : "Emails";
    const message = `${movedEmails.length} ${emailLabel} moved to Trash`;

    return {
      message,
      emails: movedEmails,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to move emails to Trash: ${message}`);
  }
}
