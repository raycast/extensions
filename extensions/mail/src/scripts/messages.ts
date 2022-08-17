import { runAppleScript } from "run-applescript";
import { Message } from "../types/types";
import { constructDate } from "../utils/utils";

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
              set output to output & msgId & "$break" & msgSubject & "$break" & msgSender & "$break" & msgSenderEmail & "$break" & msgData & "$break" & msgRead & "$break" & msgReplyTo & "$break" & replied & "$break" & forwarded & "$break" & redirected & "$break" & "$end"
            end try
          end repeat
      end tell
      return output
    `;
    const response: string[] = (await runAppleScript(script)).split("$end");
    response.pop();
    const messages: Message[] = response.map((line: string) => {
      const [id, subject, sender, senderEmail, date, read, replyTo, replied, forwarded, redirected] = line.split("$break");
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
    const script = `
      tell application "Mail"
        set mailAccount to first account whose id is "${message.account}"
        set msg to first message of first mailbox of mailAccount whose id is "${message.id}"
        return content of msg
      end tell
    `;
    const response: string = (await runAppleScript(script)).trim();
    return { ...message, content: response };
  } catch (error: any) {
    console.error(error);
    return message;
  }
};
