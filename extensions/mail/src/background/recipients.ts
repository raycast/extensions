import { runAppleScript } from "run-applescript";
import emailRegex from "email-regex";

export const getAllRecipients = async (): Promise<string[]> => {
  const script = `
    set output to ""
    tell application "Mail"
      repeat with acc in every account
        set box to (first mailbox of acc whose name is "All Mail")
        tell box
          repeat with i from 0 to 1000
            try
              set msg to message i of box
              tell msg
                set output to output & (extract address from sender) & "$break"
              end tell
            end try
          end repeat
        end tell
            set sent to (first mailbox of acc whose name is "Sent Mail")
            tell sent
                repeat with i from 0 to 100
                    try
                        set msg to message i of sent
                        tell msg
                            repeat with aRecipient in recipients
                                set output to output & aRecipient & "$break"
                            end repeat
                            repeat with ccRecipient in cc recipients
                                set output to output & ccRecipient & "$break"
                            end repeat
                            repeat with bccRecipient in bcc recipients
                                set output to output & bccRecipient & "$break"
                            end repeat
                        end tell
                    end try
                end repeat
            end tell
      end repeat
    end tell
    return output
  `;
  try {
    const response = await runAppleScript(script);
    const addresses = response
      .split("$break")
      .filter((recipient: string) => emailRegex({ exact: true }).test(recipient));
    const recipientCount: { [key: string]: number } = {};
    addresses.forEach((recipient: string) => {
      if (recipient in recipientCount) {
        recipientCount[recipient]++;
      } else {
        recipientCount[recipient] = 1;
      }
    });
    const recipients = Object.entries(recipientCount)
      .sort((a: [string, number], b: [string, number]) => b[1] - a[1])
      .map(([recipient, _]: [string, number]) => recipient);
    console.log(`Fetched ${recipients.length} Recipients`);
    return recipients;
  } catch (error) {
    console.error(error);
    return [];
  }
};
