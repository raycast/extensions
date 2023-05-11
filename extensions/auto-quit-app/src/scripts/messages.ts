import { showToast, Toast } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { Account, Mailbox, Message } from "../types";
import { constructDate, titleCase } from "../utils";
import * as cache from "../utils/cache";
import { isJunkMailbox, isTrashMailbox } from "../utils/mailbox";

export const tellMessage = async (message: Message, mailbox: Mailbox, script: string): Promise<string> => {
  if (!script.includes("msg")) {
    console.error("Script must include msg");
    return "missing value";
  }

  const appleScript = `
    tell application "Mail"
      tell account "${message.account}"
        set msg to (first message of (first mailbox whose name is "${mailbox.name}") whose id is "${message.id}")
        ${script.trim()}
      end tell
    end tell
  `;

  return await runAppleScript(appleScript);
};

export const openMessage = async (message: Message, mailbox: Mailbox) => {
  await tellMessage(message, mailbox, "open msg\nactivate");
};

export const toggleMessageRead = async (
  message: Message,
  mailbox: Mailbox,
  { silent = false }: { silent?: boolean } = {}
) => {
  try {
    const account = cache.getAccount(message.account);
    const mailboxes = account?.mailboxes || [];

    if (account && mailboxes) {
      mailboxes.forEach((innerMailbox) => {
        cache.updateMessage(
          message.id,
          {
            ...message,
            read: !message.read,
          },
          account.id,
          innerMailbox.name
        );
      });
    }

    if (!silent) {
      await showToast(Toast.Style.Success, `Message marked as ${message.read ? "unread" : "read"}`);
    }

    await tellMessage(message, mailbox, "tell msg to set read status to not read status");
  } catch (error) {
    if (!silent) {
      await showToast(Toast.Style.Failure, `Failed to mark message as ${message.read ? "unread" : "read"}`);
    }

    console.error(error);

    cache.invalidateMessages();
  }
};

export const moveMessage = async (message: Message, mailbox: Mailbox, target: Mailbox) => {
  try {
    const account = cache.getAccount(message.account);
    const mailboxes = account?.mailboxes || [];

    if (account && mailboxes) {
      mailboxes.forEach((innerMailbox) => {
        if (innerMailbox.name === target.name) {
          cache.addMessage(message, account.id, innerMailbox.name);
        } else {
          cache.deleteMessage(message.id, account.id, innerMailbox.name);
        }
      });
    }

    await showToast(Toast.Style.Success, `Moved message to ${titleCase(target.name)}`);
    await tellMessage(message, mailbox, `set mailbox of msg to first mailbox whose name is "${target.name}"`);
  } catch (error) {
    await showToast(Toast.Style.Failure, `Error moving message to ${titleCase(target.name)}`);
    console.error(error);

    cache.invalidateMessages();
  }
};

export const moveToJunk = async (message: Message, account: Account, mailbox: Mailbox) => {
  try {
    const junkMailbox = account.mailboxes.find(isJunkMailbox);
    if (junkMailbox) {
      const account = cache.getAccount(message.account);
      const mailboxes = account?.mailboxes || [];

      if (account && mailboxes) {
        mailboxes.forEach((innerMailbox) => {
          if (innerMailbox.name === junkMailbox.name) {
            cache.addMessage(message, account.id, innerMailbox.name);
          } else {
            cache.deleteMessage(message.id, account.id, innerMailbox.name);
          }
        });
      }

      await showToast(Toast.Style.Success, "Moved message to Junk");
      await moveMessage(message, mailbox, junkMailbox);
    } else {
      await showToast(Toast.Style.Failure, "No Junk mailbox found");
    }
  } catch (error) {
    await showToast(Toast.Style.Failure, "Error moving message to Junk");
    console.error(error);

    cache.invalidateMessages();
  }
};

export const moveToTrash = async (message: Message, account: Account, mailbox: Mailbox) => {
  try {
    const trashMailbox = account.mailboxes.find(isTrashMailbox);
    if (trashMailbox) {
      const account = cache.getAccount(message.account);
      const mailboxes = account?.mailboxes || [];

      if (account && mailboxes) {
        mailboxes.forEach((innerMailbox) => {
          if (innerMailbox.name === trashMailbox.name) {
            cache.addMessage(message, account.id, innerMailbox.name);
          } else {
            cache.deleteMessage(message.id, account.id, innerMailbox.name);
          }
        });
      }

      await showToast(Toast.Style.Success, "Moved message to Trash");
      await moveMessage(message, mailbox, trashMailbox);
    } else {
      await showToast(Toast.Style.Failure, "No Trash mailbox found");
    }
  } catch (error) {
    await showToast(Toast.Style.Failure, "Error moving message to Trash");
    console.error(error);

    cache.invalidateMessages();
  }
};

export const deleteMessage = async (message: Message, mailbox: Mailbox) => {
  try {
    const account = cache.getAccount(message.account);
    const mailboxes = account?.mailboxes || [];

    if (account && mailboxes.length) {
      mailboxes.forEach((mailbox) => {
        cache.deleteMessage(message.id, account.id, mailbox.name);
      });
    }

    await showToast(Toast.Style.Success, "Message deleted");
    await tellMessage(
      message,
      mailbox,
      `
        open msg
        activate
        delay 0.5
		    tell application "System Events" to key code 51`
    );
  } catch (error) {
    await showToast(Toast.Style.Failure, "Error deleting message");
    console.error(error);

    cache.invalidateMessages();
  }
};

export const getRecipients = async (message: Message, mailbox: Mailbox): Promise<string[]> => {
  const script = `
    set output to ""
    repeat with r in recipients of msg
      tell r to set output to output & name & "$break" & address & "$end"
    end repeat
  `;

  try {
    const response: string[] = (await tellMessage(message, mailbox, script)).split("$end");
    response.pop();
    const recipientNames: string[] = [];
    const recipientAddresses: string[] = [];

    for (const line of response) {
      const [name, address] = line.split("$break");
      if (address !== message.accountAddress) {
        recipientNames.push(name);
        recipientAddresses.push(address);
      }
    }

    return [message.senderAddress, ...recipientAddresses];
  } catch (error) {
    console.error(error);
    return [message.senderAddress];
  }
};

export const getAccountMessages = async (
  account: Account,
  mailbox: Mailbox,
  numMessages = 10,
  unreadOnly = false
): Promise<Message[] | undefined> => {
  let messages: Message[] = cache.getMessages(account.id, mailbox.name);

  const first = messages.length > 0 ? messages[0].id : undefined;
  const script = `
    set output to ""
    tell application "Mail"
      set mailAccount to account "${account.name}"
      set box to first mailbox of mailAccount whose name is "${mailbox.name}"
      set messageCount to count of messages in box
      set msgs to {}
      repeat with i from 1 to ${numMessages}
        if i > messageCount then exit repeat
        set msg to message i of box
        ${first ? `if id of msg is ${first} then exit repeat` : ""}
        set senderName to extract name from sender of msg
        set senderAddress to extract address from sender of msg
        set numAttachments to count of mail attachments of msg
        set messageData to {id of msg, subject of msg, senderName, senderAddress, date sent of msg, read status of msg, numAttachments}
        set end of msgs to messageData
      end repeat
    end tell
    repeat with messageData in msgs
      set output to output & item 1 of messageData & "$break" & item 2 of messageData & "$break" & item 3 of messageData & "$break" & item 4 of messageData & "$break" & item 5 of messageData & "$break" & item 6 of messageData & "$break" & item 7 of messageData & "$end"
    end repeat
    return output
`;

  try {
    const response: string[] = (await runAppleScript(script)).split("$end");
    response.pop();

    const newMessages: Message[] = response.map((line: string) => {
      const [id, subject, senderName, senderAddress, date, read, numAttachments] = line.split("$break");
      return {
        id,
        account: account.name,
        accountAddress: account.email,
        subject,
        date: constructDate(date),
        read: read === "true",
        numAttachments: parseInt(numAttachments),
        senderName,
        senderAddress,
      };
    });

    messages = newMessages.concat(messages);

    cache.setMessages(messages, account.id, mailbox.name);
  } catch (error) {
    console.error(error);
  }

  return unreadOnly ? messages.filter((x) => !x.read) : messages;
};

export const getMessageContent = async (message: Message, mailbox: Mailbox): Promise<string> => {
  try {
    return await tellMessage(message, mailbox, "tell msg to return content");
  } catch (error) {
    await showToast(Toast.Style.Failure, "Error getting message content");
    console.error(error);
    return "";
  }
};
