import { randomId, Toast, ToastStyle } from "@raycast/api";
import { getAppleContacts } from "./utils/get-whatsapp-chats";
import { phone as parsePhone } from "phone";
import { getStoredWhatsAppChats, saveStoredWhatsAppChats } from "./utils/local-storage";

export default async () => {
  const toast = new Toast({ style: ToastStyle.Animated, title: "Importing Apple contacts" });
  await toast.show();

  try {
    const storedChats = await getStoredWhatsAppChats();
    const appleContacts = await getAppleContacts();
    const whatsAppChats = appleContacts
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
          id: randomId(),
          phone,
          name: contact.name,
          pinned: false
        };
      })
      .filter((chat, index, chats) => chats.findIndex(c => c.phone === chat.phone) === index)
      .filter(chat => !storedChats.find(storedChat => storedChat.phone === chat.phone));

    await saveStoredWhatsAppChats(whatsAppChats);
    toast.style = ToastStyle.Success;
    toast.title = `Imported ${whatsAppChats.length} contacts`;
  } catch (e) {
    toast.style = ToastStyle.Failure;
    toast.title = `Failed to import contacts`;
  }
};