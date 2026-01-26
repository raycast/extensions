import { List, ActionPanel, Action, showToast, Toast, Icon, Color, openExtensionPreferences } from "@raycast/api";
import { useState, useEffect } from "react";
import { DexAPI } from "./dex-api";
import { DexContact } from "./types";
import { getContactDisplayName, getContactSubtitle } from "./utils";
import { ContactDetailList } from "./contact-detail-list";

export default function RecentContacts() {
  const [contacts, setContacts] = useState<DexContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchRecentContacts() {
      try {
        const api = new DexAPI();
        const results = await api.getRecentContacts(50);
        setContacts(results);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch recent contacts",
          message: errorMessage,
          primaryAction: errorMessage.includes("API key")
            ? {
                title: "Open Preferences",
                onAction: () => openExtensionPreferences(),
              }
            : undefined,
        });

        setContacts([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchRecentContacts();
  }, []);

  function formatDate(dateString?: string): string {
    if (!dateString) return "";

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  }

  return (
    <List isLoading={isLoading} navigationTitle="Recent Contacts" searchBarPlaceholder="Filter recent contacts...">
      {contacts.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Clock}
          title="No recent contacts"
          description="Your recently updated contacts will appear here"
          actions={
            <ActionPanel>
              <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      ) : (
        contacts.map((contact) => {
          const accessories = [];

          // Add status badges
          if (contact.emails && contact.emails.length > 0) {
            accessories.push({
              icon: Icon.Envelope,
              tooltip: `Email: ${contact.emails[0].email}`,
            });
          }

          if (contact.phones && contact.phones.length > 0) {
            accessories.push({
              icon: Icon.Phone,
              tooltip: `Phone: ${contact.phones[0].phone_number}`,
            });
          }

          // Add update time
          accessories.push({
            text: formatDate(contact.updated_at),
            tooltip: `Updated: ${contact.updated_at}`,
          });

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
