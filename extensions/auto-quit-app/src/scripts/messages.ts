import { showToast, Toast } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { constructDate } from "../utils";
import { Account, Mailbox, Message } from "../types";
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

export const toggleMessageRead = async (message: Message, mailbox: Mailbox) => {
  await tellMessage(message, mailbox, "tell msg to set read status to not read status");
};

export const moveMessage = async (message: Message, mailbox: Mailbox, target: Mailbox) => {
  await tellMessage(message, mailbox, `set mailbox of msg to first mailbox whose name is "${target.name}"`);
};

export const moveToJunk = async (message: Message, account: Account, mailbox: Mailbox) => {
  try {
    const junkMailbox = account.mailboxes.find(isJunkMailbox);
    if (junkMailbox) {
      await moveMessage(message, mailbox, junkMailbox);
      await showToast(Toast.Style.Success, "Moved message to junk");
    } else {
      await showToast(Toast.Style.Failure, "No junk mailbox found");
    }
  } catch (error) {
    await showToast(Toast.Style.Failure, "Error moving message to junk");
    console.error(error);
  }
};

export const moveToTrash = async (message: Message, account: Account, mailbox: Mailbox) => {
  try {
    const trashMailbox = account.mailboxes.find(isTrashMailbox);
    if (trashMailbox) {
      await moveMessage(message, mailbox, trashMailbox);
      await showToast(Toast.Style.Success, "Moved message to trash");
    } else {
      await showToast(Toast.Style.Failure, "No trash mailbox found");
    }
  } catch (error) {
    await showToast(Toast.Style.Failure, "Error moving message to trash");
    console.error(error);
  }
};

export const deleteMessage = async (message: Message, mailbox: Mailbox) => {
  try {
    await tellMessage(
      message,
      mailbox,
      `open msg
      activate
      delay 0.5
		  tell application "System Events" to key code 51`
    );
    await showToast(Toast.Style.Success, "Message deleted");
  } catch (error) {
    await showToast(Toast.Style.Failure, "Error deleting message");
    console.error(error);
  }
};

export const getRecipients = async (message: Message, mailbox: Mailbox): Promise<string[]> => {
  const script = `
    set output to ""
    tell application "Mail"
      set acc to (first account whose id is "${message.account}")
      tell acc
        set msg to (first message of (first mailbox whose name is "${mailbox.name}") whose id is "${message.id}")
        repeat with r in recipients of msg
          tell r to set output to output & name & "$break" & address & "$end"
        end repeat
      end tell
    end tell
    return output
  `;
  try {
    const response: string[] = (await runAppleScript(script)).split("$end");
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
  cacheMailbox: string,
  numMessages = 10,
  unreadOnly = false
): Promise<Message[] | undefined> => {
  let messages: Message[] = cache.getMessages(account.id, cacheMailbox);
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
    const newMessages: Message[] = response
      .map((line: string) => {
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
      })
      .filter((msg: Message) => !unreadOnly || !msg.read);
    messages = newMessages.concat(messages);
    cache.setMessages(messages, account.id, cacheMailbox);
  } catch (error) {
    console.error(error);
  }
  return messages;
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
