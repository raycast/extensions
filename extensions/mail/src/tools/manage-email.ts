import type { Tool } from "@raycast/api";

import { getMessageById, moveMessageTo, setMessageReadStatus } from "../scripts/messages";
import { isArchiveMailbox, isJunkMailbox } from "../utils/mailbox";

type Input = {
  action: "markRead" | "markUnread" | "archive" | "junk" | "move";
  messageId: string;
  accountName?: string;
  mailboxName?: string;
  targetMailbox?: string;
};

async function getContext(input: Input) {
  const { account, mailbox, message } = await getMessageById(input.messageId, {
    accountName: input.accountName,
    mailboxName: input.mailboxName,
  });

  if (input.action === "markRead" || input.action === "markUnread") {
    return { account, mailbox, message };
  }

  if (input.action === "move" && !input.targetMailbox?.trim()) {
    throw new Error("A target mailbox is required for the move action");
  }

  const normalizedTarget = input.targetMailbox?.trim().toLowerCase();
  const targetMailbox =
    input.action === "archive"
      ? account.mailboxes.find(isArchiveMailbox)
      : input.action === "junk"
        ? account.mailboxes.find(isJunkMailbox)
        : account.mailboxes.find((candidate) => candidate.name.trim().toLowerCase() === normalizedTarget);

  if (!targetMailbox) {
    throw new Error(
      input.action === "move"
        ? `Mailbox "${input.targetMailbox || ""}" was not found in account "${account.name}"`
        : `No ${input.action === "archive" ? "Archive" : "Junk"} mailbox found in account "${account.name}"`,
    );
  }

  return { account, mailbox, message, targetMailbox };
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  if (input.action === "markRead" || input.action === "markUnread") {
    return undefined;
  }

  const context = await getContext(input);
  const actionLabel = {
    archive: "archive",
    junk: "move to Junk",
    move: `move to ${context.targetMailbox?.name}`,
  }[input.action];
  const alreadyAtDestination = context.targetMailbox?.name === context.mailbox.name;

  return {
    message: alreadyAtDestination
      ? `This email is already in ${context.targetMailbox?.name}. No move is needed.`
      : `Are you sure you want to ${actionLabel}?`,
    info: [
      { name: "Subject", value: context.message.subject },
      { name: "From", value: context.message.senderAddress },
      { name: "Account", value: context.account.name },
      { name: "Current Mailbox", value: context.mailbox.name },
      ...(context.targetMailbox ? [{ name: "Destination", value: context.targetMailbox.name }] : []),
    ],
  };
};

export default async function (input: Input) {
  const context = await getContext(input);

  if (input.action === "markRead" || input.action === "markUnread") {
    const read = input.action === "markRead";
    const alreadyInState = context.message.read === read;
    if (!alreadyInState) {
      await setMessageReadStatus(context.message, context.mailbox, read);
    }

    return {
      message: alreadyInState
        ? `Email was already marked as ${read ? "read" : "unread"}`
        : `Email marked as ${read ? "read" : "unread"}`,
      id: context.message.id,
      read,
    };
  }

  const targetMailbox = context.targetMailbox;
  if (!targetMailbox) {
    throw new Error("Destination mailbox was not resolved");
  }

  if (targetMailbox.name !== context.mailbox.name) {
    await moveMessageTo(context.message, context.mailbox, targetMailbox, { silent: true });
  }

  return {
    message:
      targetMailbox.name === context.mailbox.name
        ? `Email was already in ${targetMailbox.name}`
        : `Email moved to ${targetMailbox.name}`,
    id: context.message.id,
    accountName: context.account.name,
    mailboxName: targetMailbox.name,
  };
}
