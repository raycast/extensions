import { randomId, Toast, ToastStyle } from "@raycast/api";
import { getAppleContacts } from "./utils/get-apple-contacts";
import { phone as parsePhone } from "phone";
import { getStoredWhatsAppChats, saveStoredWhatsAppChats } from "./utils/local-storage";
import { AppleContact, isPhoneChat, PhoneChat } from "./utils/types";

function getMostCommonPrefix(contacts: Array<AppleContact>) {
  const prefixCount = contacts.reduce((acc: Record<string, number>, contact) => {
    const phone = parsePhone(contact.phone as string);
    if (phone.isValid) {
      acc[phone.countryCode] = (acc[phone.countryCode] || 0) + 1;
    }
    return acc;
  }, {});
  return Object.keys(prefixCount).reduce((a, b) => {
    if (prefixCount[a] > prefixCount[b]) {
      return a;
    }
    return b;
  }, Object.keys(prefixCount)[0]);
}

export default async () => {
  const toast = new Toast({ style: ToastStyle.Animated, title: "Importing Apple contacts" });
  await toast.show();

  try {
    const storedChats = await getStoredWhatsAppChats();
    const appleContacts = await getAppleContacts();
    const commonPrefix = getMostCommonPrefix(appleContacts);

    const whatsAppChats: Array<PhoneChat> = appleContacts
      .map(contact => {
        const phone = contact.phone.startsWith("+") ? contact.phone : `+${commonPrefix}${contact.phone}`;
        return {
          name: contact.name,
          phoneInformation: parsePhone(phone)
        };
      })
      .filter(contact => contact.phoneInformation.isValid)
      .map(contact => {
        const phone = contact.phoneInformation.phoneNumber as string;
        return {
          id: randomId(),
          phone,
          name: contact.name,
          pinned: false
        };
      })
      .filter((chat, index, chats) => chats.findIndex(c => c.phone === chat.phone) === index)
      .filter(chat => !storedChats.filter(isPhoneChat).find(storedChat => storedChat.phone === chat.phone));

    if (whatsAppChats.length > 0) {
      await saveStoredWhatsAppChats([...storedChats, ...whatsAppChats]);
      toast.style = ToastStyle.Success;
      toast.title = `Imported ${whatsAppChats.length} ${whatsAppChats.length > 1 ? "contacts" : "contact"}`;
    } else {
      toast.style = ToastStyle.Success;
      toast.title = `No new contacts to import`;
    }
  } catch (error) {
    console.error(error);
    toast.style = ToastStyle.Failure;
    toast.title = `Failed to import contacts`;
  }
};