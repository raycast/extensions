import { ActionPanel, Action, List, LocalStorage, Icon, confirmAlert } from "@raycast/api";
import AddContact from "./form";
import { useEffect, useState } from "react";
import { Contact } from "./interfaces";
import { AppIcon } from "./enums";

export default function Command() {
  const [contacts, setContacts] = useState<Contact[]>([]);

  useEffect(() => {
    async function getContacts() {
      const contacts = await LocalStorage.getItem<string>("contacts");
      setContacts(JSON.parse(contacts ?? "[]"));
    }
    getContacts();
  }, []);

  async function removeContact(value: Contact) {
    if (await confirmAlert({ title: "Are you sure?" })) {
      const newContacts = contacts.filter((item) => item.url !== value.url);
      setContacts(newContacts);
      await LocalStorage.setItem("contacts", JSON.stringify(newContacts));
    }
  }

  return (
    <List
      actions={
        <ActionPanel>
          <Action.Push title="Add Contact" target={<AddContact />} />
        </ActionPanel>
      }
    >
      {contacts.map((item) => (
        <List.Item
          key={item.url}
          icon={item.icon === AppIcon.Generic ? Icon.Person : { source: `icons/${item.icon}` }}
          title={item.name}
          subtitle={item.url}
          accessories={[{ text: item.app }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={item.url} />
              <Action.CopyToClipboard content={item.url} />
              <Action
                title="Remove"
                icon={Icon.Trash}
                shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                onAction={() => removeContact(item)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
