import { Action, ActionPanel, Grid, Icon, Image } from "@raycast/api";
import { getAvatarIcon } from "@raycast/utils";
import { getDisplayName, getPhotoUrl, getPrimaryEmail } from "../helpers";
import { Person } from "../types";
import { SortField, ViewMode } from "../search-contacts";
import ContactActions from "./ContactActions";
import ContactForm from "./ContactForm";

interface ContactGridProps {
  contacts: Person[];
  isLoading: boolean;
  viewMode: ViewMode;
  sortField: SortField;
  onViewModeChange: (value: string) => void;
  onSortFieldChange: (value: string) => void;
  onContactDeleted: () => void;
  onContactUpdated: () => void;
  onRefresh: () => void;
}

function ViewModeDropdown({ value, onChange }: { value: ViewMode; onChange: (value: string) => void }) {
  return (
    <Grid.Dropdown tooltip="View" storeValue value={value} onChange={onChange}>
      <Grid.Dropdown.Item title="List" value="list" icon={Icon.AppWindowList} />
      <Grid.Dropdown.Item title="Detail" value="detail" icon={Icon.AppWindowSidebarRight} />
      <Grid.Dropdown.Item title="Grid" value="grid" icon={Icon.AppWindowGrid3x3} />
    </Grid.Dropdown>
  );
}

function groupByLetter(contacts: Person[], sortField: SortField): [string, Person[]][] {
  const groups: Record<string, Person[]> = {};
  for (const contact of contacts) {
    let key: string;
    if (sortField === "last") {
      const lastName = contact.names?.[0]?.familyName;
      const ch = lastName ? lastName.charAt(0).toUpperCase() : "";
      key = /[A-Z]/.test(ch) ? ch : "#";
    } else {
      const name = getDisplayName(contact);
      const ch = name.charAt(0).toUpperCase();
      key = /[A-Z]/.test(ch) ? ch : "#";
    }
    (groups[key] ??= []).push(contact);
  }
  return Object.entries(groups).sort(([a], [b]) => {
    if (a === "#") return 1;
    if (b === "#") return -1;
    return a.localeCompare(b);
  });
}

export default function ContactGrid({
  contacts,
  isLoading,
  viewMode,
  sortField,
  onViewModeChange,
  onSortFieldChange,
  onContactDeleted,
  onContactUpdated,
  onRefresh,
}: ContactGridProps) {
  const sections = groupByLetter(contacts, sortField);

  return (
    <Grid
      isLoading={isLoading}
      columns={5}
      fit={Grid.Fit.Contain}
      navigationTitle={`${contacts.length} contacts`}
      searchBarPlaceholder="Filter contacts..."
      searchBarAccessory={<ViewModeDropdown value={viewMode} onChange={onViewModeChange} />}
    >
      <Grid.EmptyView
        title="No Contacts Found"
        description="Try a different search or create a new contact"
        icon={Icon.AddressBook}
        actions={
          <ActionPanel>
            <Action.Push title="Create Contact" icon={Icon.Plus} target={<ContactForm onSaved={onRefresh} />} />
          </ActionPanel>
        }
      />
      {sections.map(([letter, sectionContacts]) => (
        <Grid.Section key={letter} title={letter}>
          {sectionContacts.map((contact) => {
            const displayName = getDisplayName(contact);
            const photoUrl = getPhotoUrl(contact);
            const email = getPrimaryEmail(contact);

            return (
              <Grid.Item
                key={contact.resourceName}
                content={photoUrl ? { source: photoUrl, mask: Image.Mask.Circle } : getAvatarIcon(displayName)}
                title={displayName}
                keywords={[
                  contact.names?.[0]?.givenName ?? "",
                  contact.names?.[0]?.familyName ?? "",
                  email ?? "",
                  contact.organizations?.[0]?.name ?? "",
                ]}
                actions={
                  <ContactActions
                    contact={contact}
                    viewMode={viewMode}
                    sortField={sortField}
                    onViewModeChange={onViewModeChange}
                    onSortFieldChange={onSortFieldChange}
                    onContactDeleted={onContactDeleted}
                    onContactUpdated={onContactUpdated}
                    onRefresh={onRefresh}
                  />
                }
              />
            );
          })}
        </Grid.Section>
      ))}
    </Grid>
  );
}
