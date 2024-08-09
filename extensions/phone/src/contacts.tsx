import React, { useEffect, useState } from "react";
import { Action, ActionPanel, List } from "@raycast/api";

type Contact = {
  id: string;
  givenName: string;
  familyName: string;
  phoneNumbers: string[];
  emailAddresses: string[];
  photo: string;
};

interface ContactsProps {
  contacts: Contact[];
  inputValue: string;
  handleAction: (contact: Contact) => void;
  getAvatarIcon: (name: string) => string;
}

export default function Contacts({ contacts, inputValue, handleAction, getAvatarIcon }: ContactsProps) {
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);

  function getName(contact: Contact) {
    return `${contact.givenName}${contact.familyName ? ` ${contact.familyName}` : ""}`;
  }

  useEffect(() => {
    setFilteredContacts(
      contacts.filter(
        (contact) =>
          (contact.givenName || contact.familyName) &&
          `${contact.givenName} ${contact.familyName}`.toLowerCase().includes(inputValue.toLowerCase()),
      ),
    );
  }, [inputValue, contacts]);

  return (
    <>
      {filteredContacts.map((contact) => (
        <List.Item
          key={contact.id}
          title={getName(contact)}
          icon={contact.photo ? `data:image/png;base64,${contact.photo}` : getAvatarIcon(getName(contact))}
          actions={
            <ActionPanel>
              <Action title="Select" onAction={() => handleAction(contact)} />
            </ActionPanel>
          }
        />
      ))}
    </>
  );
}
