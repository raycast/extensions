import { ActionPanel, Icon, List, OpenInBrowserAction } from "@raycast/api";
import { useWhatsappContacts } from "./utils/use-whatsapp-contacts";
import { WhatsAppContact } from "./utils/types";

export default function ContactList() {
  const [contacts, setContacts] = useWhatsappContacts();

  const pinnedContacts = contacts.filter(contact => contact.pinned);
  const unpinnedContacts = contacts.filter(contact => !contact.pinned);

  const handlePin = (contact: WhatsAppContact) => {
    const newContacts = contacts.map(c => {
      if (c.phone === contact.phone) {
        return { ...c, pinned: !c.pinned };
      }
      return c;
    });
    setContacts(newContacts);
  };

  return (
    <List isLoading={contacts.length === 0} searchBarPlaceholder="Filter contacts by name or phone...">
      {pinnedContacts.length > 0 && (
        <List.Section title="Pinned Contacts">
          {pinnedContacts.map(contact => (
            <ContactListItem key={contact.phone} contact={contact} onPinAction={handlePin} />
          ))}
        </List.Section>
      )}
      {pinnedContacts.length === 0 ? (
        <>
          {unpinnedContacts.map(contact => (
            <ContactListItem key={contact.phone} contact={contact} onPinAction={handlePin} />
          ))}
        </>
      ) : (
        <List.Section title="Other Contacts">
          {unpinnedContacts.map(contact => (
            <ContactListItem key={contact.phone} contact={contact} onPinAction={handlePin} />
          ))}
        </List.Section>
      )}
    </List>
  );
}

interface ContactListItemProps {
  contact: WhatsAppContact;
  onPinAction: (contact: WhatsAppContact) => void;
}

function ContactListItem({ contact, onPinAction }: ContactListItemProps) {
  const urlPhone = contact.phone.replace(/[^D]/, "");
  return (
    <List.Item
      id={contact.phone}
      title={contact.name}
      subtitle={contact.phone}
      icon="whatsapp.png"
      actions={
        <ActionPanel>
          <OpenInBrowserAction
            title="Open in WhatsApp"
            icon="whatsapp-outline.png"
            url={`whatsapp://send?phone=${urlPhone}&text=`} // The empty text parameter is used to focus the chat automatically
          />
          <OpenInBrowserAction
            title="Open in Browser"
            icon={Icon.Globe}
            url={`https://web.whatsapp.com/send?phone=${urlPhone}&text=`}
          />
          <ActionPanel.Item
            title={contact.pinned ? "Unpin Contact" : "Pin Contact"}
            shortcut={{ modifiers: ["cmd"], key: "p" }}
            icon={Icon.Pin}
            onAction={() => onPinAction(contact)}
          />
        </ActionPanel>
      }
    />
  );
}