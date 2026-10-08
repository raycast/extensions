import { ActionPanel, Action, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { authorizedWithFreeAgent } from "./oauth";
import { Contact } from "./types";
import { fetchContacts } from "./services/freeagent";
import { parseDate, getContactUrl, getContactDisplayName } from "./utils/formatting";
import { useFreeAgent } from "./hooks/useFreeAgent";

const ListContacts = function Command() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const { isLoading, isAuthenticated, accessToken, companyInfo, handleError } = useFreeAgent();

  useEffect(() => {
    async function loadContacts() {
      if (!isAuthenticated || !accessToken) return;

      try {
        const contactList = await fetchContacts(accessToken);
        setContacts(contactList);
      } catch (error) {
        handleError(error, "Failed to fetch contacts");
      }
    }

    loadContacts();
  }, [isAuthenticated, accessToken]);

  return (
    <List isLoading={isLoading}>
      {contacts.map((contact) => (
        <List.Item
          key={contact.url}
          icon={Icon.Person}
          title={getContactDisplayName(contact)}
          subtitle={contact.email || "No email"}
          accessories={[{ text: contact.status }, { date: parseDate(contact.created_at) }]}
          actions={
            companyInfo ? (
              <ActionPanel>
                <Action.OpenInBrowser url={getContactUrl(contact.url, companyInfo)} />
                {contact.email && (
                  <Action.CopyToClipboard title="Copy Email" content={contact.email} icon={Icon.Envelope} />
                )}
              </ActionPanel>
            ) : undefined
          }
        />
      ))}
    </List>
  );
};

export default authorizedWithFreeAgent(ListContacts);
