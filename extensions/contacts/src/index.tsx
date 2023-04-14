import { ActionPanel, List, Action, Icon } from "@raycast/api";
import { useContacts } from "./useContacts";

export default function Command() {
  const { contacts, isLoading, refreshContacts } = useContacts();

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={!isLoading}
      actions={
        <ActionPanel>
          <Action title="Refresh Cache" onAction={refreshContacts} />
        </ActionPanel>
      }
    >
      {Object.keys(contacts).map((letter) => (
        <List.Section key={letter} title={letter}>
          {contacts[letter].map((contact, idx) => (
            <List.Item
              key={idx}
              title={contact.firstName + " " + contact.lastName}
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Name" text={`${contact.firstName} ${contact.lastName}`} />
                      <List.Item.Detail.Metadata.Label title="Emails" text={contact.emails.join("\n")} />
                      <List.Item.Detail.Metadata.Label title="Phone numbers" text={contact.phones.join("\n")} />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <Action.Open
                    title="Open in Contacts"
                    target={`addressbook://${contact.id}`}
                    icon={Icon.PersonCircle}
                  />
                  {contact.emails.length > 0 &&
                    contact.emails.map((email) => (
                      <Action.Open
                        key={email}
                        title={`Email ${email}`}
                        target={`mailto:${email}`}
                        icon={Icon.Envelope}
                      />
                    ))}
                  {contact.phones.length > 0 &&
                    contact.phones.map((phone) => (
                      <Action.Open
                        key={phone}
                        title={`Call ${phone}`}
                        target={`tel:${phone}`}
                        icon={Icon.PhoneRinging}
                      />
                    ))}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
