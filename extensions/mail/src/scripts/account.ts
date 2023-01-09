import { runAppleScript } from "run-applescript";
import { Account } from "../types/types";
import * as cache from "../utils/cache";

export const getMailAccounts = async (): Promise<Account[] | undefined> => {
  const script = `
  set output to ""
  tell application "Mail"
    set mailAccounts to every account
    repeat with mailAcc in mailAccounts
      repeat 1 times
        if (count of every mailbox of mailAcc) is 0 then exit repeat
        set accId to id of mailAcc
        set accName to name of mailAcc
        set accUser to user name of mailAcc
        set fullName to full name of mailAcc
        set accEmail to email addresses of mailAcc
        try
          set mainMailbox to (first mailbox of mailAcc whose name is "All Mail")
          set numUnread to unread count of mainMailbox
        on error
          try
            set mainMailbox to (first mailbox of mailAcc whose name is "INBOX")
            set numUnread to unread count of mainMailbox
          on error
            set numUnread to 0
          end try
        end try
        set output to output & accId & "," & accName & "," & accUser & "," & fullName & "," & accEmail & "," & numUnread & "\n"
      end repeat
    end repeat
  end tell
  return output
  `;
  let accounts = cache.getAccounts();
  if (!accounts) {
    try {
      const response: string[] = (await runAppleScript(script)).split("\n");
      response.pop();
      accounts = response.map((line: string) => {
        const [id, name, userName, fullName, email, numUnread] = line.split(",");
        return { id, name, userName, fullName, email, numUnread: parseInt(numUnread) };
      });
      if (accounts) {
        cache.setAccounts(accounts);
      }
    } catch (error) {
      console.error(error);
      return undefined;
    }
  }
  return accounts;
};
