import { AppleContact, WhatsAppContact } from "./types";
import { runJxa } from "run-jxa";
import { phone as parsePhone } from "phone";
import { getStoredPinnedPhones } from "./local-storage";

export async function getWhatsAppContacts(): Promise<Array<WhatsAppContact>> {
  try {
    const pinnedPhones = await getStoredPinnedPhones();

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
      return [];
    }

    return contacts
      .filter(contact => contact.phones.length > 0)
      .flatMap(contact => {
        return contact.phones.map(phone => {
          return {
            name: contact.name,
            phoneInformation: parsePhone(phone)
          };
        });
      })
      .filter(contact => contact.phoneInformation.isValid)
      .map(contact => {
        const phone = contact.phoneInformation.phoneNumber as string;
        return {
          phone,
          name: contact.name,
          pinned: pinnedPhones.includes(phone)
        };
      })
      .filter((contact, index, self) => self.findIndex(c => c.phone === contact.phone) === index)
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error(error);
    return [];
  }
}