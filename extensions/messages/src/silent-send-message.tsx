import { showHUD, closeMainWindow } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { fetchAllContacts } from "swift:../swift/contacts";

type Contact = {
  id: string;
  givenName: string;
  familyName: string;
  phoneNumbers: string[];
  emailAddresses: string[];
};

function getName(contact: Contact) {
  return `${contact.givenName}${contact.familyName ? ` ${contact.familyName}` : ""}`;
}

export default async function Command(props: { arguments: { contactName: string; messageText: string } }) {
  const { contactName, messageText } = props.arguments;

  if (!contactName || !messageText) {
    await showHUD("❌ Missing arguments: Both contact name and message text are required");
    return;
  }

  try {
    await showHUD("🔍 Finding contact...");
    const contacts = await fetchAllContacts() as Contact[];
    const selectedContact = contacts.find((contact) => contact.givenName.toLowerCase().startsWith(contactName.toLowerCase()));

    if (!selectedContact) {
      await showHUD("❌ Contact not found");
      return;
    }

    const address = selectedContact.phoneNumbers[0] || selectedContact.emailAddresses[0];
    const name = getName(selectedContact);

    await showHUD(`📤 Sending message to ${name}...`);

    const result = await runAppleScript(
      `
      on run argv
        try
          tell application "Messages"
            set targetBuddy to item 1 of argv
            set targetService to id of 1st account
            set textMessage to item 2 of argv
            set theBuddy to participant targetBuddy of account id targetService
            send textMessage to theBuddy
          end tell
          return "Success"
        on error error_message
          return error_message
        end try
      end run
    `,
      [address, messageText]
    );

    if (result === "Success") {
      await showHUD(`✅ Message sent to ${name}`);
    } else {
      await showHUD(`❌ Failed to send message: ${result}`);
    }
  } catch (error) {
    await showHUD(`❌ Error: ${String(error)}`);
  } finally {
    await closeMainWindow();
  }
}