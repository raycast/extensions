import { showToast, Toast } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { constructDate } from "../utils/utils";
import { Account, Message } from "../types/types";
import * as cache from "../utils/cache";

export const tellMessage = async (message: Message, mailbox: string, script: string): Promise<string> => {
  if (!script.includes("msg")) throw "Script must include msg";
  return await runAppleScript(`
    tell application "Mail"
      set acc to (first account whose id is "${message.account}")
      tell acc
        set msg to (first message of (first mailbox whose name is "${mailbox}") whose id is "${message.id}")
        ${script.trim()}
      end tell
    end tell
  `);
};

export const openMessage = async (message: Message, mailbox: string): Promise<void> => {
  await tellMessage(message, mailbox, "open msg\nactivate");
};

export const toggleMessageRead = async (message: Message, mailbox: string): Promise<void> => {
  await tellMessage(message, mailbox, "tell msg to set read status to not read status");
};

export const moveMessage = async (message: Message, mailbox: string, target: string): Promise<void> => {
  await tellMessage(message, mailbox, `set mailbox of msg to (first mailbox whose name is "${target}")`);
};

export const moveToJunk = async (message: Message, mailbox: string): Promise<void> => {
  try {
    await moveMessage(message, mailbox, "Spam");
    await showToast(Toast.Style.Success, "Moved Message to Junk");
  } catch (error) {
    await showToast(Toast.Style.Failure, "Error Moving Message To Junk");
    console.error(error);
  }
};

export const deleteMessage = async (message: Message, mailbox: string): Promise<void> => {
  try {
    await moveMessage(message, mailbox, "Trash");
    await showToast(Toast.Style.Success, "Message Deleted");
  } catch (error) {
    await showToast(Toast.Style.Failure, "Error Deleting Message");
    console.error(error);
  }
};

export const getRecipients = async (message: Message): Promise<Message | undefined> => {
  const script = `
    set output to ""
    tell application "Mail"
      set acc to (first account whose id is "${message.account}")
      tell acc
        set msg to (first message of (first mailbox whose name is "All Mail") whose id is "${message.id}")
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
    return { ...message, recipientNames, recipientAddresses };
  } catch (error) {
    console.error(error);
    return message;
  }
};

export const getAccountMessages = async (
  account: Account,
  cacheMailbox: string,
  mailbox: string = "All Mail",
  numMessages: number = 50,
  unreadOnly: boolean = false
): Promise<Message[] | undefined> => {
  let messages = cache.getMessages(account.id, cacheMailbox);
  const first = messages.length > 0 ? messages[0].id : undefined;
  const script = `
    set output to ""
    tell application "Mail"
      set mailAccount to first account whose id is "${account.id}"
      set box to (first mailbox of mailAccount whose name is "${mailbox}")
        repeat with i from 1 to ${numMessages}
          try 
            set msg to message i of box
            ${first ? `if id of msg is ${first} then exit repeat` : ""}
            tell msg 
              set senderName to extract name from sender
              set senderAddress to extract address from sender
              set numAttachments to count of mail attachments
              set output to output & id & "$break" & subject & "$break" & senderName & "$break" & senderAddress & "$break" & date sent & "$break" & read status & "$break" & numAttachments & "$end"
            end tell
          end try
        end repeat
    end tell
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
          account: account.id,
          accountAddress: account.email,
          subject,
          content: "",
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
  } catch (error: any) {
    console.error(error);
  }
  return messages;
};

export const getMessageContent = async (message: Message, mailbox: string): Promise<Message> => {
  try {
    const content = await tellMessage(message, mailbox, "tell msg to return content");
    return { ...message, content };
  } catch (error: any) {
    await showToast(Toast.Style.Failure, "Error Getting Message Content");
    console.error(error);
    return message;
  }
};
