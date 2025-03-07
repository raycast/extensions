import { ActionPanel, Action, List, showToast, Toast, Icon, open } from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import { searchContacts, deleteContact } from "swift:../swift";
import { Contact, ErrorResponse } from "./types";
import { AuthorizationView } from "./components/AuthorizationView";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [data, setData] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ErrorResponse | null>(null);

  const fetchContacts = useCallback(async (query: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await searchContacts(query);
      let response;

      try {
        response = JSON.parse(result);
      } catch (e) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to parse contacts",
          message: String(e),
        });
        setIsLoading(false);
        return;
      }

      if (response.error) {
        setError(response);
        setData([]);
      } else {
        setData(response);
        setError(null);
      }
    } catch (e) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error fetching contacts",
        message: String(e),
      });
      setError({
        error: true,
        type: "fetch",
        message: String(e),
      });
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContacts(searchText);
  }, [searchText, fetchContacts]);

  async function handleDeleteContact(contactID: string) {
    try {
      setIsLoading(true);
      const result = await deleteContact(contactID);
      const response = JSON.parse(result);

      if (response.error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to delete contact",
          message: response.message,
        });
      } else {
        showToast({
          style: Toast.Style.Success,
          title: "Contact Deleted",
          message: response.message,
        });
        // Refresh the contact list
        fetchContacts(searchText);
      }
    } catch (e) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error deleting contact",
        message: String(e),
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchText} searchBarPlaceholder="Search contacts..." throttle>
      {error ? (
        error.type === "authorization" ? (
          <AuthorizationView error={error} onRetry={() => fetchContacts(searchText)} />
        ) : (
          <List.EmptyView icon={Icon.ExclamationMark} title="Error Fetching Contacts" description={error.message} />
        )
      ) : data.length === 0 ? (
        <List.EmptyView icon={Icon.Person} title="No Contacts Found" description="Try a different search term" />
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

  // Format email with label if available
  let emailDisplay = "";
  if (contact.emailsWithLabels && contact.emailsWithLabels.length > 0) {
    const email = contact.emailsWithLabels[0];
    emailDisplay = `${email.address} (${email.label})`;
  } else if (contact.emails && contact.emails.length > 0) {
    emailDisplay = contact.emails[0];
  }

  // Format phone with label if available
  let phoneDisplay = "";
  if (contact.phonesWithLabels && contact.phonesWithLabels.length > 0) {
    const phone = contact.phonesWithLabels[0];
    phoneDisplay = `${phone.number} (${phone.label})`;
  } else if (contact.phones && contact.phones.length > 0) {
    phoneDisplay = contact.phones[0];
  }

  return (
    <List.Item
      title={fullName || "No Name"}
      subtitle={emailDisplay}
      accessories={[{ text: phoneDisplay }]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title="Open in Contacts"
              icon={Icon.Person}
              onAction={async () => {
                try {
                  await open(`addressbook://${contact.id}`);
                } catch (error) {
                  showToast({
                    style: Toast.Style.Failure,
                    title: "Failed to open Contacts app",
                    message: String(error),
                  });
                }
              }}
            />
            {(contact.emailsWithLabels && contact.emailsWithLabels.length > 0) ||
            (contact.emails && contact.emails.length > 0) ? (
              <Action.CopyToClipboard
                title="Copy Email"
                icon={Icon.Envelope}
                content={
                  contact.emailsWithLabels && contact.emailsWithLabels.length > 0
                    ? contact.emailsWithLabels[0].address
                    : contact.emails[0]
                }
                shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
              />
            ) : null}
            {(contact.phonesWithLabels && contact.phonesWithLabels.length > 0) ||
            (contact.phones && contact.phones.length > 0) ? (
              <Action.CopyToClipboard
                title="Copy Phone"
                icon={Icon.Phone}
                content={
                  contact.phonesWithLabels && contact.phonesWithLabels.length > 0
                    ? contact.phonesWithLabels[0].number
                    : contact.phones[0]
                }
                shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
              />
            ) : null}
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
