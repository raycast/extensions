import { runAppleScript } from "@raycast/utils";

import { Account, Mailbox } from "../types";
import { Cache } from "../utils/cache";
import { getMailboxIcon, sortMailboxes } from "../utils/mailbox";

export const getAccounts = async (): Promise<Account[] | undefined> => {
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
          set {TID, AppleScript's text item delimiters} to {AppleScript's text item delimiters, " | "}
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

  let accounts = Cache.getAccounts();
  if (!accounts) {
    try {
      const response: string[] = (await runAppleScript(script)).split("\n");
      response.pop();

      accounts = await Promise.all(
        response.map(async (line: string) => {
          const [id, name, userName, fullName, emails, numUnread] = line.split(",");
          return {
            id,
            name,
            userName,
            fullName,
            emails: emails.split(" | "),
            numUnread: parseInt(numUnread),
            mailboxes: await getMailboxes(name),
          };
        }),
      );

      if (accounts) {
        Cache.setAccounts(accounts);
      }
    } catch (error) {
      console.error(error);
      return undefined;
    }
  }

  return accounts;
};

export const getMailboxes = async (accountName: string): Promise<Mailbox[]> => {
  const script = `
    set output to ""
    tell application "Mail"
      set mailAcc to account "${accountName}"
      set mbs to every mailbox of mailAcc
      repeat with mb in mbs
        tell mb 
          set output to output & name & "," & unread count & "\n"
        end tell
      end repeat
    end tell
    return output
  `;

  try {
    const response: string[] = (await runAppleScript(script)).split("\n");
    response.pop();

    const mailboxes: Mailbox[] = response
      .map((line: string) => {
        const lastCommaIndex = line.lastIndexOf(",");
        const name = line.substring(0, lastCommaIndex);
        const unreadCount = line.substring(lastCommaIndex + 1);
        return { name, icon: getMailboxIcon(name), unreadCount: parseInt(unreadCount) };
      })
      .sort(sortMailboxes);

    return mailboxes;
  } catch (error) {
    console.error(error);
    return [];
  }
};
