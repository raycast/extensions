// contacts.ts
import { runAppleScript } from "run-applescript";
import { homedir } from "os";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";

interface Contact {
  name: string;
  phone: string;
}

const cacheDir = join(homedir(), "Library/Application Support/raycast-whatsapp");
const cacheFile = join(cacheDir, "contacts.json");

async function getContacts(): Promise<string> {
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
  console.log("getContacts");
  return result;
}

function saveContacts(contacts: Contact[]) {
  console.log("saveContacts");
  mkdirSync(cacheDir, { recursive: true });
  writeFileSync(cacheFile, JSON.stringify(contacts, null, 2), "utf-8");
}

function loadContacts(): Contact[] {
  console.log("loadContacts");
  if (existsSync(cacheFile)) {
    const data = readFileSync(cacheFile, "utf-8");
    return JSON.parse(data) as Contact[];
  } else {
    return [];
  }
}

async function refreshContacts(): Promise<Contact[]> {
  console.log("refreshContacts");
  const result = await getContacts();
  const contacts = result
    .split("\n")
    .filter((line: string) => line.trim() !== "")
    .map((line: string) => {
      const [name, phone] = line.split("|").map((s: string) => s.trim());
      return { name, phone };
    });

  saveContacts(contacts);
  return contacts;
}

export { loadContacts, refreshContacts };
