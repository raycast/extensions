import React, { useState } from "react";
import { List, getPreferenceValues } from "@raycast/api";
import { getAvatarIcon, runAppleScript } from "@raycast/utils";
import Contacts from "./contacts";
import { Contact } from "./interfaces";
import { useContacts } from "./helper";

const preferences = getPreferenceValues<Preferences>();

export default function Command() {
  const [inputValue, setInputValue] = useState<string>("");
  const { contacts } = useContacts();

  function handleAction(contact: Contact) {
    const phoneNumber = contact.phoneNumbers[0];
    if (phoneNumber) {
      callNumber(phoneNumber);
    }
  }

  function callNumber(number: string) {
    const removeConfirmation = `-- Get the localized name of the button "Call"
      tell application "FaceTime" to set Call_loc to localized string "Call"
      tell window 1
        click button Call_loc
      end tell`;
    const appleScript = `
      do shell script "open facetime://" & quoted form of "${number}"
      tell application "System Events" to tell process "FaceTime"
        set frontmost to true
        repeat until exists window 1
          delay 0.1
        end repeat
        ${preferences.no_confirmation ? removeConfirmation : ""}
      end tell
    `;
    runAppleScript(appleScript);
  }

  return (
    <List
      filtering={false}
      onSearchTextChange={setInputValue}
      navigationTitle="Facetime"
      searchBarPlaceholder="Facetime someone"
    >
      <Contacts
        contacts={contacts ?? []}
        inputValue={inputValue}
        handleAction={handleAction}
        getAvatarIcon={getAvatarIcon}
      />
    </List>
  );
}
