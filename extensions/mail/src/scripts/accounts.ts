import { executeAppleScript } from "../utils/apple-script";

import { Account, Mailbox } from "../types";
import { Cache } from "../utils/cache";
import { getMailboxIcon, sortMailboxes } from "../utils/mailbox";

const APPLE_SCRIPT_TIMEOUT = 60000;

const logAppleScriptError = (context: string, error: unknown) => {
  if (error instanceof Error && error.message.includes("Command timed out")) {
    console.error(`${context}: AppleScript timed out after ${APPLE_SCRIPT_TIMEOUT}ms`);
    return;
  }

  console.error(`${context}:`, error);
};

export const getAccounts = async (): Promise<Account[] | undefined> => {
  const script = `
    set output to ""
    tell application "Mail"
      set mailAccounts to every account
      repeat with mailAcc in mailAccounts
        try
          set isEnabled to enabled of mailAcc
        on error
          set isEnabled to true
        end try

        set probePassed to false
        set numUnread to 0

        if isEnabled is true and (count of every mailbox of mailAcc) > 0 then
          try
            set mainMailbox to (first mailbox of mailAcc whose name is "INBOX")
            set numUnread to unread count of mainMailbox
            set probePassed to true
          on error
            try
              set mainMailbox to (first mailbox of mailAcc whose name is "All Mail")
              set numUnread to unread count of mainMailbox
              set probePassed to true
            on error
              try
                set mainMailbox to (first mailbox of mailAcc whose name contains "inbox")
                set numUnread to unread count of mainMailbox
                set probePassed to true
              on error
                try
                  set mainMailbox to (first mailbox of mailAcc)
                  set numUnread to unread count of mainMailbox
                  set probePassed to true
                end try
              end try
            end try
          end try
        end if

        set accId to id of mailAcc
        set accName to name of mailAcc
        set accUser to user name of mailAcc
        set fullName to full name of mailAcc
        set accEmail to email addresses of mailAcc
        
        set {TID, AppleScript's text item delimiters} to {AppleScript's text item delimiters, " | "}
        set accEmailStr to accEmail as string
        set AppleScript's text item delimiters to TID

        set output to output & accId & "|||" & accName & "|||" & accUser & "|||" & fullName & "|||" & accEmailStr & "|||" & numUnread & "|||" & (isEnabled as string) & "|||" & (probePassed as string) & "\n"
      end repeat
    end tell
    return output
  `;

  let accounts = Cache.getAccounts();
  if (!accounts) {
    try {
      const response: string[] = (await executeAppleScript(script, "getAccounts")).split("\n");
      response.pop();

      const loadedAccounts: Account[] = [];
      for (const line of response) {
        const parts = line.split("|||");
        if (parts.length < 8) continue;
        const [id, name, userName, fullName, emails, numUnread, isEnabledStr, probePassedStr] = parts;

        const enabled = isEnabledStr === "true";
        const mailboxProbePassed = probePassedStr === "true";

        if (!(enabled === true && mailboxProbePassed)) {
          continue;
        }

        const mailboxes = await getMailboxes(name);
        if (mailboxes.length === 0) continue;

        loadedAccounts.push({
          id,
          name,
          userName,
          fullName,
          emails: emails.split(" | "),
          numUnread: parseInt(numUnread),
          mailboxes,
          enabled,
        });
      }

      accounts = loadedAccounts;

      if (accounts) {
        Cache.setAccounts(accounts);
      }
    } catch (error) {
      logAppleScriptError("Failed to get Mail accounts", error);
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
          set output to output & name & "|||" & unread count & "\n"
        end tell
      end repeat
    end tell
    return output
  `;

  try {
    const response: string[] = (await executeAppleScript(script, "getMailboxes")).split("\n");
    response.pop();

    const mailboxes: Mailbox[] = response
      .map((line: string) => {
        const lastIndex = line.lastIndexOf("|||");
        const name = line.substring(0, lastIndex);
        const unreadCount = line.substring(lastIndex + 3);
        return { name, icon: getMailboxIcon(name), unreadCount: parseInt(unreadCount) };
      })
      .sort(sortMailboxes);

    return mailboxes;
  } catch (error) {
    logAppleScriptError(`Failed to get mailboxes for ${accountName}`, error);
    return [];
  }
};
