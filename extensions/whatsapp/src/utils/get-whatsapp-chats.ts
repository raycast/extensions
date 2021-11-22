import { AppleContact } from "./types";
import { runJxa } from "run-jxa";

export async function getAppleContacts(): Promise<Array<AppleContact>> {
  const contacts: Array<AppleContact> | null = await runJxa(`
            const contacts = Application('Contacts');
            return contacts.people().map(person => {
                return {
                    name: person.name(),
                    phones: person.phones().map(phone => phone.value()),
                };
            });
        `);

  if (!contacts) {
    throw new Error("No contacts found");
  }

  return contacts;
}