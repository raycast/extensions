import { ActionPanel, Action, List, showToast, Toast, Icon, open } from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import { searchContacts, deleteContact } from "swift:../swift";

interface Contact {
  id: string;
  givenName: string;
  familyName: string;
  emails: string[];
  phones: string[];
}

interface ErrorResponse {
  error: boolean;
  type: string;
  status?: string;
  message: string;
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [data, setData] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ErrorResponse | null>(null);

  // Function to fetch contacts
  const fetchContacts = useCallback(async (query: string) => {
    setIsLoading(true);
    try {
      const responseJson = await searchContacts(query);
      const response = JSON.parse(responseJson);

      // Check if response is an error
      if (response.error) {
        setError(response as ErrorResponse);
        setData([]);
      } else {
        // It's a successful response with contacts
        setError(null);
        setData(response as Contact[]);
      }
    } catch (e) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to parse contacts",
        message: String(e),
      });
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch and when search text changes
  useEffect(() => {
    fetchContacts(searchText);
  }, [searchText, fetchContacts]);

  // Handle contact deletion
  async function handleDeleteContact(contactID: string) {
    showToast({
      style: Toast.Style.Animated,
      title: "Deleting Contact",
    });

    try {
      const responseJson = await deleteContact(contactID);
      const response = JSON.parse(responseJson);

      if (response.error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to Delete Contact",
          message: response.message,
        });
      } else {
        showToast({
          style: Toast.Style.Success,
          title: "Contact Deleted",
        });

        // Refresh the contact list
        await fetchContacts(searchText);
      }
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error Deleting Contact",
        message: String(error),
      });
    }
  }

  // If there's an authorization error, show a special UI
  if (error && error.type === "authorization") {
    return (
      <List isLoading={isLoading}>
        <List.EmptyView
          icon={Icon.Lock}
          title="Contacts Access Required"
          description={error.message}
          actions={
            <ActionPanel>
              <Action
                title="Open System Preferences"
                icon={Icon.Gear}
                onAction={() => {
                  open("x-apple.systempreferences:com.apple.preference.security?Privacy_Contacts");
                }}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchText} searchBarPlaceholder="Search contacts..." throttle>
      {error ? (
        <List.EmptyView icon={Icon.ExclamationMark} title="Error Fetching Contacts" description={error.message} />
      ) : (
        <List.Section title="Results" subtitle={data.length + ""}>
          {data.map((contact) => (
            <ContactListItem key={contact.id} contact={contact} onDelete={handleDeleteContact} />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function ContactListItem({
  contact,
  onDelete,
}: {
  readonly contact: Contact;
  readonly onDelete: (id: string) => void;
}) {
  const fullName = `${contact.givenName} ${contact.familyName}`.trim();

  return (
    <List.Item
      title={fullName || "No Name"}
      subtitle={contact.emails[0] || ""}
      accessories={[{ text: contact.phones[0] || "" }]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title="Open in Contacts"
              icon={Icon.Person}
              onAction={() => {
                open(`addressbook://${contact.id}`);
              }}
            />
            {contact.emails[0] && (
              <Action.CopyToClipboard
                title="Copy Email"
                icon={Icon.Envelope}
                content={contact.emails[0]}
                shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
              />
            )}
            {contact.phones[0] && (
              <Action.CopyToClipboard
                title="Copy Phone"
                icon={Icon.Phone}
                content={contact.phones[0]}
                shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
              />
            )}
            <Action
              title="Delete Contact"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
              onAction={() => onDelete(contact.id)}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
