import { showToast, Toast } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { constructDate } from "../utils/utils";
import { Message } from "../types/types";

const tellMessage = async (message: Message, script: string): Promise<string> => {
  if (!script.includes("msg")) return "";
  return await runAppleScript(`
    tell application "Mail"
      set acc to (first account whose id is "${message.account}")
      tell acc
        set msg to (first message of (first mailbox whose name is "All Mail") whose id is "${message.id}")
        ${script.trim()}
      end tell
      activate
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
  numMessages: number = 50,
  mailbox: string = "All Mail",
  unreadOnly: boolean = false
): Promise<Message[] | undefined> => {
  try {
    const script = `
      set output to ""
      tell application "Mail"
        set mailAccount to first account whose id is "${accountId}"
        set accMailBox to (first mailbox of mailAccount whose name is "${mailbox}")
          repeat with i from 1 to ${numMessages}
            try 
              set msg to message i of accMailBox
              set msgId to id of msg
              set msgSubject to subject of msg
              set msgSender to extract name from sender of msg
              set msgSenderEmail to extract address from sender of msg
              set msgData to date sent of msg
              set msgRead to read status of msg
              set msgReplyTo to reply to of msg
              set replied to was replied to of msg
              set forwarded to was forwarded of msg
              set redirected to was redirected of msg
              set output to output & msgId & "$break" & msgSubject & "$break" & msgSender & "$break" & msgSenderEmail & "$break" & msgData & "$break" & msgRead & "$break" & msgReplyTo & "$break" & replied & "$break" & forwarded & "$break" & redirected & "$end"
            end try
          end repeat
      end tell
      return output
    `;
    const response: string[] = (await runAppleScript(script)).split("$end");
    response.pop();
    const messages: Message[] = response.map((line: string) => {
      const [id, subject, sender, senderEmail, date, read, replyTo, replied, forwarded, redirected] =
        line.split("$break");
      return {
        id,
        account: accountId,
        subject,
        content: "",
        sender,
        senderEmail,
        date: constructDate(date),
        read: read === "true",
        replyTo,
        replied: replied === "true",
        forwarded: forwarded === "true",
        redirected: redirected === "true",
      };
    });
    return unreadOnly ? messages.filter((msg: Message) => !msg.read) : messages;
  } catch (error: any) {
    console.error(error);
    return undefined;
  }
};

export const getMessageContent = async (message: Message): Promise<Message> => {
  try {
    const content = await tellMessage(message, "tell msg to return content");
    return { ...message, content };
  } catch (error: any) {
    console.error(error);
    return message;
  }
};
