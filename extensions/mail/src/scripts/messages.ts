import { showToast, Toast } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { constructDate } from "../utils/utils";
import { Message } from "../types/types";
import * as cache from "../utils/cache";

export const tellMessage = async (message: Message, script: string): Promise<string> => {
  if (!script.includes("msg")) throw "Script must include msg";
  return await runAppleScript(`
    tell application "Mail"
      set acc to (first account whose id is "${message.account}")
      tell acc
        set msg to (first message of (first mailbox whose name is "All Mail") whose id is "${message.id}")
        ${script.trim()}
      end tell
    end tell
  `);
};

export const openMessage = async (message: Message): Promise<void> => {
  await tellMessage(message, "open msg\nactivate");
};

export const toggleMessageRead = async (message: Message): Promise<void> => {
  await tellMessage(message, "tell msg to set read status to not read status");
};

export const moveMessage = async (message: Message, mailbox: string): Promise<void> => {
  await tellMessage(message, `set mailbox of msg to (first mailbox whose name is "${mailbox}")`);
};

export const moveToJunk = async (message: Message): Promise<void> => {
  try {
    await moveMessage(message, "Spam");
    await showToast(Toast.Style.Success, "Moved Message to Junk");
  } catch (error) {
    await showToast(Toast.Style.Failure, "Error Moving Message To Junk");
    console.error(error);
  }
};

export const deleteMessage = async (message: Message): Promise<void> => {
  try {
    await moveMessage(message, "Trash");
    await showToast(Toast.Style.Success, "Message Deleted");
  } catch (error) {
    await showToast(Toast.Style.Failure, "Error Deleting Message");
    console.error(error);
  }
};

export const getAccountMessages = async (
  accountId: string,
  cacheMailbox: string,
  mailbox: string = "All Mail",
  numMessages: number = 50,
  unreadOnly: boolean = false
): Promise<Message[] | undefined> => {
  let messages = cache.getMessages(accountId, cacheMailbox);
  const first = messages.length > 0 ? messages[0].id : undefined;
  const script = `
    set output to ""
    tell application "Mail"
      set mailAccount to first account whose id is "${accountId}"
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
          account: accountId,
          subject,
          content: "",
          senderName,
          senderAddress,
          date: constructDate(date),
          read: read === "true",
          numAttachments: parseInt(numAttachments),
        };
      })
      .filter((msg: Message) => !unreadOnly || !msg.read);
    messages = newMessages.concat(messages);
    cache.setMessages(messages, accountId, cacheMailbox);
  } catch (error: any) {
    console.error(error);
  }
  return messages;
};

export const getMessageContent = async (message: Message): Promise<Message> => {
  try {
    const content = await tellMessage(message, "tell msg to return content");
    return { ...message, content };
  } catch (error: any) {
    await showToast(Toast.Style.Failure, "Error Getting Message Content");
    console.error(error);
    return message;
  }
};
