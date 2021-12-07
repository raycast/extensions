import { AppleContact, isAppleContact } from "./types";
import { runAppleScript } from "run-applescript";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { randomId } from "@raycast/api";

export async function getAppleContacts(): Promise<Array<AppleContact>> {
  const fileName = randomId();

  await runAppleScript(`
    tell application "Contacts"
      set the clipboard to (vcard of people) as text
      do shell script "LANG=en_US.UTF-8 pbpaste >~/Desktop/${fileName}.vcf"
      set the clipboard to ""
    end tell`
  );

  const filePath = path.join(os.homedir(), "Desktop", `${fileName}.vcf`);
  const buffer = await fs.readFile(filePath);

  const contacts = buffer.toString()
    .split("BEGIN:VCARD")
    .filter(Boolean)
    .map(card => {
      return {
        name: card.match(/FN:(.*)/)?.[1],
        phone: card.match(/TEL;.*type=pref:(.*)/)?.[1]
      };
    })
    .filter(isAppleContact);

  await fs.unlink(filePath);

  return contacts;
}