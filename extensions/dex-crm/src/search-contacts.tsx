import { List, ActionPanel, Action, showToast, Toast, Icon, Color, openExtensionPreferences } from "@raycast/api";
import { useState, useEffect } from "react";
import { DexAPI } from "./dex-api";
import { DexContact } from "./types";
import { getContactDisplayName, getContactSubtitle } from "./utils";
import { ContactDetailList } from "./contact-detail-list";

export default function SearchContacts() {
  const [contacts, setContacts] = useState<DexContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    async function fetchContacts() {
      try {
        const api = new DexAPI();

        if (searchText) {
          // Search with query
          const results = await api.searchContacts(searchText);
          setContacts(results);
        } else {
          // Show recent contacts when no search
          const results = await api.getRecentContacts(50);
          setContacts(results);
        }

        if (isInitialLoad) {
          setIsInitialLoad(false);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        // Show more helpful error messages
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch contacts",
          message: errorMessage,
          primaryAction: errorMessage.includes("API key")
            ? {
                title: "Open Preferences",
                onAction: () => openExtensionPreferences(),
              }
            : undefined,
        });

        // Clear contacts on error to show empty state
        setContacts([]);
      } finally {
        setIsLoading(false);
      }
    }

    setIsLoading(true);
    fetchContacts();
  }, [searchText]);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search contacts by name, job title, or email..."
      searchText={searchText}
      throttle
    >
      {contacts.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Person}
          title="No contacts found"
          description="Try adjusting your search or check your API key in preferences"
          actions={
            <ActionPanel>
              <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      ) : (
        contacts.map((contact) => {
          const accessories = [];

          // Add email badge
          if (contact.emails && contact.emails.length > 0) {
            accessories.push({
              icon: Icon.Envelope,
              tooltip: `Email: ${contact.emails[0].email}`,
            });
          }

          // Add phone badge
          if (contact.phones && contact.phones.length > 0) {
            accessories.push({
              icon: Icon.Phone,
              tooltip: `Phone: ${contact.phones[0].phone_number}`,
            });
          }

          // Add LinkedIn badge
          if (contact.linkedin) {
            accessories.push({
              icon: Icon.Person,
              tooltip: "Has LinkedIn",
            });
          }

          return (
            <List.Item
              key={contact.id}
              icon={{ source: Icon.Person, tintColor: Color.Blue }}
              title={getContactDisplayName(contact)}
              subtitle={getContactSubtitle(contact)}
              accessories={accessories}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action.Push
                      title="View Details"
                      icon={Icon.Eye}
                      target={<ContactDetailList contact={contact} />}
                    />
                  </ActionPanel.Section>

                  <ActionPanel.Section title="💬 Quick Actions">
                    {contact.emails && contact.emails.length > 0 && (
                      <Action.OpenInBrowser
                        title="Send Email"
                        icon={Icon.Envelope}
                        url={`mailto:${contact.emails[0].email}`}
                        shortcut={{ modifiers: ["cmd"], key: "e" }}
                      />
                    )}
                    {contact.phones && contact.phones.length > 0 && (
                      <Action.OpenInBrowser
                        title="Call Phone"
                        icon={Icon.Phone}
                        url={`tel:${contact.phones[0].phone_number}`}
                        shortcut={{ modifiers: ["cmd"], key: "p" }}
                      />
                    )}
                  </ActionPanel.Section>

                  <ActionPanel.Section title="📋 Copy">
                    {contact.emails && contact.emails.length > 0 && (
                      <Action.CopyToClipboard
                        title="Copy Email"
                        content={contact.emails[0].email}
                        shortcut={{ modifiers: ["cmd"], key: "c" }}
                        icon={Icon.Envelope}
                      />
                    )}
                    {contact.phones && contact.phones.length > 0 && (
                      <Action.CopyToClipboard
                        title="Copy Phone"
                        content={contact.phones[0].phone_number}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                        icon={Icon.Phone}
                      />
                    )}
                  </ActionPanel.Section>

                  <ActionPanel.Section title="🔗 Open">
                    <Action.OpenInBrowser
                      title="Open in Dex"
                      icon={Icon.Globe}
                      url={`https://app.getdex.com/contacts/${contact.id}`}
                      shortcut={{ modifiers: ["cmd"], key: "o" }}
                    />
                    {contact.linkedin && (
                      <Action.OpenInBrowser
                        title="Open Linkedin"
                        icon={Icon.Person}
                        url={contact.linkedin}
                        shortcut={{ modifiers: ["cmd"], key: "l" }}
                      />
                    )}
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
