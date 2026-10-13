import type { Tool } from "@raycast/api";

import { getMessageContent, getMessageById, getRecipients, sendMessage } from "../scripts/messages";
import { OutgoingMessageAction } from "../types";
import { Validation } from "../utils/validation";

type Input = {
  action: "reply" | "replyAll" | "forward";
  messageId: string;
  accountName?: string;
  mailboxName?: string;
  to?: string[];
  from?: string;
  subject?: string;
  content: string;
};

const actionMap = {
  reply: OutgoingMessageAction.Reply,
  replyAll: OutgoingMessageAction.ReplyAll,
  forward: OutgoingMessageAction.Forward,
} satisfies Record<Input["action"], OutgoingMessageAction>;

const getSubject = (action: Input["action"], subject: string, originalSubject: string) => {
  if (subject.trim()) {
    return subject.trim();
  }

  if (action === "forward") {
    return originalSubject.toLowerCase().startsWith("fwd:") ? originalSubject : `Fwd: ${originalSubject}`;
  }

  return originalSubject.toLowerCase().startsWith("re:") ? originalSubject : `Re: ${originalSubject}`;
};

async function getContext(input: Input) {
  const { account, mailbox, message } = await getMessageById(input.messageId, {
    accountName: input.accountName,
    mailboxName: input.mailboxName,
  });

  if (Validation.required(input.content)) {
    throw new Error("Message content is required");
  }

  const from = input.from || account.emails[0];
  if (!account.emails.includes(from)) {
    throw new Error(`Email address "${from}" is not part of account "${account.name}"`);
  }

  const recipients =
    input.action === "reply"
      ? [message.senderAddress]
      : input.action === "replyAll"
        ? await getRecipients(message, mailbox, { strict: true })
        : input.to || [];
  const ownAddresses = new Set(account.emails.map((address) => address.toLowerCase()));
  const seenRecipients = new Set<string>();
  const to = recipients.reduce<string[]>((result, recipient) => {
    const address = recipient.trim();
    const normalizedAddress = address.toLowerCase();
    if (
      !address ||
      (input.action !== "forward" && ownAddresses.has(normalizedAddress)) ||
      seenRecipients.has(normalizedAddress)
    ) {
      return result;
    }

    seenRecipients.add(normalizedAddress);
    result.push(address);
    return result;
  }, []);

  if (to.length === 0) {
    throw new Error(
      input.action === "forward"
        ? "At least one recipient is required to forward"
        : "No external reply recipient found",
    );
  }

  const invalidRecipient = to.find((recipient) => Validation.email(recipient));
  if (invalidRecipient) {
    throw new Error(`Invalid recipient email address: ${invalidRecipient}`);
  }

  const subject = getSubject(input.action, input.subject || "", message.subject);
  const content =
    input.action === "forward"
      ? `${input.content.trim()}\n\n---------- Forwarded message ----------\nFrom: ${message.senderAddress}\nSubject: ${message.subject}\n\n${await getMessageContent(message, mailbox)}`
      : input.content.trim();

  return { account, mailbox, message, from, to, subject, content };
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const { account, message, from, to, subject, content } = await getContext(input);

  return {
    message: `Are you sure you want to ${input.action === "replyAll" ? "reply to all" : input.action}?`,
    info: [
      { name: "Original", value: message.subject },
      { name: "From", value: from },
      { name: "To", value: to.join(", ") },
      { name: "Subject", value: subject },
      { name: "Content", value: content },
      { name: "Account", value: account.name },
      ...(input.action === "forward" && message.numAttachments > 0
        ? [{ name: "Source Attachments", value: String(message.numAttachments) }]
        : []),
    ],
  };
};

export default async function (input: Input) {
  const { mailbox, message, from, to, subject, content } = await getContext(input);

  await sendMessage(
    {
      from,
      to,
      cc: [],
      bcc: [],
      subject,
      content,
    },
    actionMap[input.action],
    message,
    mailbox,
  );

  return { message: `${input.action} sent`, messageId: message.id, recipients: to };
}
