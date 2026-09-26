import { Action, ActionPanel, Icon, List, useNavigation, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getContacts } from "../scripts/contacts";
import { Cache } from "../utils/cache";

export type ContactPickerProps = {
  fieldTitle?: string;
  onSelect: (email: string) => void;
};

export const ContactPicker = ({ fieldTitle = "To", onSelect }: ContactPickerProps) => {
  const { pop } = useNavigation();
  const {
    data: contacts,
    isLoading,
    revalidate,
  } = useCachedPromise(getContacts, [], {
    keepPreviousData: true,
  });

  const handleSelect = (email: string, name: string) => {
    onSelect(email);
    pop();
    showToast({
      style: Toast.Style.Success,
      title: `Added ${name || email} to ${fieldTitle}`,
    });
  };

  const handleRefresh = async () => {
    Cache.invalidateContacts();
    await revalidate();
    showToast({
      style: Toast.Style.Success,
      title: "Contacts refreshed",
    });
  };

  // Flatten contact email entries for fast searching and selection
  const contactEntries = (contacts || []).flatMap((contact) =>
    contact.emails.map((emailObj) => ({
      name: contact.name,
      email: emailObj.email,
      label: emailObj.label,
    })),
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={`Search contacts to add to ${fieldTitle}...`}
      navigationTitle={`Select Recipient (${fieldTitle})`}
    >
      <List.EmptyView
        icon={Icon.Person}
        title={isLoading ? "Loading contacts..." : "No contacts found"}
        description={
          isLoading
            ? "Fetching your contacts from macOS Contacts"
            : "No contacts with email addresses were found. Ensure Contacts permissions are granted."
        }
      />
      {contactEntries.map((entry, index) => (
        <List.Item
          key={`${entry.email}-${index}`}
          icon={Icon.Person}
          title={entry.name || entry.email}
          subtitle={entry.name ? entry.email : undefined}
          keywords={[entry.name, entry.email, entry.label || ""]}
          accessories={entry.label ? [{ tag: entry.label }] : undefined}
          actions={
            <ActionPanel>
              <Action
                title={`Add to ${fieldTitle}`}
                icon={Icon.Checkmark}
                onAction={() => handleSelect(entry.email, entry.name)}
              />
              <Action.CopyToClipboard title="Copy Email Address" content={entry.email} />
              <Action
                title="Refresh Contacts"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={handleRefresh}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
};
