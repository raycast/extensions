import { useEffect, useState } from "react";
import { WhatsAppContact } from "./types";
import { getWhatsAppContacts } from "./get-whatsapp-contacts";
import { getStoredWhatsAppContacts, saveStoredPinnedPhones, saveStoredWhatsAppContacts } from "./local-storage";

export function useWhatsappContacts() {
  const [contacts, setContacts] = useState<Array<WhatsAppContact>>([]);

  useEffect(() => {
    const fetchContacts = async () => {
      const storedContacts = await getStoredWhatsAppContacts();
      if (storedContacts.length > 0) {
        setContacts(storedContacts);
      }
      const whatsAppContacts = await getWhatsAppContacts();
      setContacts(whatsAppContacts);
    };
    fetchContacts();
  }, []);

  useEffect(() => {
    const syncContacts = async () => {
      await saveStoredWhatsAppContacts(contacts);
      await saveStoredPinnedPhones(contacts.filter(c => c.pinned).map(c => c.phone));
    };
    syncContacts();
  }, [contacts]);

  return [contacts, setContacts] as const;
}

