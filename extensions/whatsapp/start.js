

import { runAppleScript } from "run-applescript";

(async () => {
  const result = await runAppleScript(`
    tell application "Contacts"
        set theContacts to every person
        set contactList to ""
        repeat with aContact in theContacts
            set contactName to name of aContact
            try
                set contactPhone to value of first phone of aContact
            on error
                set contactPhone to "No Phone"
            end try
            set contactList to contactList & contactName & " | " & contactPhone & linefeed
        end repeat
        return contactList
    end tell
  `);

  console.log(result);
})();