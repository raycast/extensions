import { runAppleScript } from "run-applescript";
import { Account } from "../types/types";

export const getMailAccounts = async (): Promise<Account[] | null> => {
  try {
    const script = `
      set output to ""
      tell application "Mail"
        set mailAccounts to every account
        repeat with mailAcc in mailAccounts
          set accId to id of mailAcc
          set accName to name of mailAcc
          set accUser to user name of mailAcc
          set fullName to full name of mailAcc
          set accEmail to email addresses of mailAcc
          set output to output & accId & "," & accName & "," & accUser & "," & fullName & "," & accEmail & "," & "\n"
        end repeat
      end tell
      return output`;
    const response: string[] = (await runAppleScript(script)).split("\n");
    response.pop(); 
    const accounts: Account[] = response.map((line: string) => {
      const [id, name, userName, fullName, email] = line.split(",");
      return { id, name, userName, fullName, email };
    });
    return accounts;
  } catch (error: any) {
    console.error(error);
    return null;
  }
};
