import { useState } from "react";
import { Cache } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { Contact, ContactGroup } from "./types";

const cache = new Cache();
const CACHE_KEY = "contacts";

function parseArrayStrings(string: string): string[] {
  return string
    .replace("[", "")
    .replace("]", "")
    .split(",")
    .map((item) => item.trim());
}

function parseContacts(data: string) {
  const contacts = [];
  const lines = data.trim().split("\n");

  for (const line of lines) {
    const parts = line.split(/,(?![^[]*\])/);
    const firstName = parts[0];
    const lastName = parts[1];
    const emails = parts[2] !== "[]" ? parseArrayStrings(parts[2]) : [];
    const phones = parts[3] !== "[]" ? parseArrayStrings(parts[3]) : [];
    const id = parts[4] || "0";

    const contact = {
      firstName,
      lastName,
      emails,
      phones,
      id,
    };
    contacts.push(contact);
  }

  return contacts;
}

// Fetch all contacts from the AppleScript
async function getAllContacts(limit = 9999): Promise<Contact[]> {
  const csvString = await runAppleScript(`set contactList to {}
  tell application "Contacts"
    set allPeople to every person
    set counter to 0
    repeat with aPerson in allPeople
      if counter > ${limit} then exit repeat
      set contact to {}
      set contactId to id of aPerson
      set firstName to first name of aPerson
      set lastName to last name of aPerson
      set emailList to {}
      repeat with anEmail in emails of aPerson
        set end of emailList to value of anEmail
      end repeat
      set phoneList to {}
      repeat with aPhone in phones of aPerson
        set end of phoneList to value of aPhone
      end repeat
      set end of contactList to {firstName, lastName, emailList, phoneList, contactId}
      set counter to counter + 1
    end repeat
  end tell
  
  set outputStr to ""
  repeat with aContact in contactList
    set contactStr to ""
    repeat with i from 1 to count of aContact
      if i > 1 then set contactStr to contactStr & ","
      if i = 3 or i = 4 then
        set bracketedValue to ""
        repeat with j from 1 to count of (item i of aContact)
          if j > 1 then set bracketedValue to bracketedValue & ","
          set bracketedValue to bracketedValue & (item j of (item i of aContact))
        end repeat
        if bracketedValue is "" then
          set bracketedValue to "[]"
        else
          set bracketedValue to "[" & bracketedValue & "]"
        end if
        set contactStr to contactStr & bracketedValue
      else
        set contactStr to contactStr & item i of aContact
      end if
    end repeat
    set outputStr to outputStr & contactStr & linefeed
  end repeat
  
  return outputStr  
  `);

  const parsedContacts = parseContacts(csvString);
  return parsedContacts;
}

// A react hook to fetch contacts from the cache or from the AppleScript
export function useContacts(limit = 9999): ContactContext {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  function refreshContacts() {
    setIsLoading(true);
    getAllContacts(limit).then((parsedContacts) => {
      console.log(parsedContacts);
      cache.set(CACHE_KEY, JSON.stringify(parsedContacts));
      setContacts(parsedContacts);
      setIsLoading(false);
    });
  }

  if (contacts.length === 0) {
    const cachedContacts = cache.get(CACHE_KEY);
    if (cachedContacts) {
      console.log("Using cached contacts");
      setContacts(JSON.parse(cachedContacts));
    } else {
      console.log("Fetching contacts from AppleScript");
      getAllContacts(limit).then((parsedContacts) => {
        console.log(parsedContacts);
        cache.set(CACHE_KEY, JSON.stringify(parsedContacts));
        setContacts(parsedContacts);
      });
    }
  }

  // Sort contacts alphabetically by last name
  const sortedContacts = contacts.sort((a, b) => {
    if (a.lastName < b.lastName) {
      return -1;
    }
    if (a.lastName > b.lastName) {
      return 1;
    }
    return 0;
  });

  // Group contacts by first letter of last name
  const groupedContacts = sortedContacts.reduce((acc, contact) => {
    const firstLetter = contact.lastName[0].toUpperCase();
    if (!acc[firstLetter]) {
      acc[firstLetter] = [];
    }
    acc[firstLetter].push(contact);
    return acc;
  }, {} as ContactGroup);

  return { contacts: groupedContacts, isLoading, refreshContacts };
}

interface ContactContext {
  contacts: ContactGroup;
  isLoading: boolean;
  refreshContacts: () => void;
}
