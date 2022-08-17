import { runAppleScript } from "run-applescript";
import { Message } from "../types/types";
import { formatDate } from "../utils/utils";

export const getAccountMessages = async (accountId: string): Promise<Message[] | null> => {
  try {
    const script = `
      set output to ""
      tell application "Mail"
        set mailAccount to first account whose id is "${accountId}"
          set allMails to first mailbox of mailAccount
          repeat with i from 1 to 50
            set msg to message i of allMails
            set msgId to id of msg
            set msgSubject to subject of msg
            set msgSender to sender of msg
            set msgData to date sent of msg
            set msgRead to read status of msg
            set msgReplyTo to reply to of msg
            set replied to was replied to of msg
            set forwarded to was forwarded of msg
            set redirected to was redirected of msg
            set output to output & msgId & "$break" & msgSubject & "$break" & msgSender & "$break" & msgData & "$break" & msgRead & "$break" & msgReplyTo & "$break" & replied & "$break" & forwarded & "$break" & redirected & "$break" & "$end"
          end repeat
      end tell
      return output
    `; 
    const response: string[] = (await runAppleScript(script)).split("$end");
    response.pop();
    const messages: Message[] = response.map((line: string) => {
      const [id, subject, sender, date, read, replyTo, replied, forwarded, redirected] = line.split("$break");
      return { id, account: accountId, subject, content: "", sender, date: formatDate(date), read, replyTo, replied, forwarded, redirected };
    }); 
    return messages; 
  } catch (error: any) {
    console.error(error);
    return null;
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
