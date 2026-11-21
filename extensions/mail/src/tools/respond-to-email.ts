import type { Tool } from "@raycast/api";

import { getMessageById, getNativeReplyRecipients, sendMessage } from "../scripts/messages";
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

  const nativeReplyRecipients =
    input.action === "forward" ? undefined : await getNativeReplyRecipients(message, mailbox, actionMap[input.action]);
  const recipients = input.to ?? nativeReplyRecipients?.to ?? [];
  const seenRecipients = new Set<string>();
  const to = recipients.reduce<string[]>((result, recipient) => {
    const address = recipient.trim();
    const normalizedAddress = address.toLowerCase();
    if (!address || seenRecipients.has(normalizedAddress)) {
      return result;
    }

    seenRecipients.add(normalizedAddress);
    result.push(address);
    return result;
  }, []);

  if (to.length === 0) {
    throw new Error(
      input.action === "forward" ? "At least one recipient is required to forward" : "No reply recipient found",
    );
  }

  const invalidRecipient = to.find((recipient) => Validation.email(recipient));
  if (invalidRecipient) {
    throw new Error(`Invalid recipient email address: ${invalidRecipient}`);
  }

  const subject = getSubject(input.action, input.subject || "", message.subject);
  const content = input.content.trim();
  const cc = nativeReplyRecipients?.cc ?? [];
  const bcc = nativeReplyRecipients?.bcc ?? [];
  const toOverride = input.action === "forward" || input.to !== undefined ? to : [];

  return { account, mailbox, message, from, to, cc, bcc, toOverride, subject, content };
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const { account, message, from, to, cc, bcc, subject, content } = await getContext(input);

  return {
    message: `Are you sure you want to ${input.action === "replyAll" ? "reply to all" : input.action}?`,
    info: [
      { name: "Original", value: message.subject },
      { name: "From", value: from },
      { name: "To", value: to.join(", ") },
      ...(cc.length > 0 ? [{ name: "Cc", value: cc.join(", ") }] : []),
      ...(bcc.length > 0 ? [{ name: "Bcc", value: bcc.join(", ") }] : []),
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
  const { mailbox, message, from, to, toOverride, subject, content } = await getContext(input);

  await sendMessage(
    {
      from,
      to: toOverride,
      cc: [],
      bcc: [],
      subject,
      content,
    },
    actionMap[input.action],
    message,
    mailbox,
    { preserveNativeReplyRecipients: input.action !== "forward" && input.to === undefined },
  );

  return { message: `${input.action} sent`, messageId: message.id, recipients: to };
}
