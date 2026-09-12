import { Action, ActionPanel, Grid, Icon, Image } from "@raycast/api";
import { getAvatarIcon } from "@raycast/utils";
import { getDisplayName, getPhotoUrl, getPrimaryEmail, groupByLetter, isStarred, SortField } from "../helpers";
import { ContactGroup, Person, ViewMode, VIEW_MODE_OPTIONS } from "../types";
import ContactActions from "./ContactActions";
import ContactForm from "./ContactForm";

interface ContactGridProps {
  contacts: Person[];
  groups: ContactGroup[];
  isLoading: boolean;
  viewMode: ViewMode;
  sortField: SortField;
  selectedGroup: string;
  onViewModeChange: (value: string) => void;
  onSortFieldChange: (value: string) => void;
  onContactDeleted: () => void;
  onContactUpdated: () => void;
  onRefresh: () => void;
  onFilterByGroup: (groupResourceName: string) => void;
}

function ViewModeDropdown({ value, onChange }: { value: ViewMode; onChange: (value: string) => void }) {
  return (
    <Grid.Dropdown tooltip="View" storeValue value={value} onChange={onChange}>
      {VIEW_MODE_OPTIONS.map((opt) => (
        <Grid.Dropdown.Item key={opt.value} title={opt.title} value={opt.value} icon={opt.icon} />
      ))}
    </Grid.Dropdown>
  );
}

export default function ContactGrid({
  contacts,
  groups,
  isLoading,
  viewMode,
  sortField,
  selectedGroup,
  onViewModeChange,
  onSortFieldChange,
  onContactDeleted,
  onContactUpdated,
  onRefresh,
  onFilterByGroup,
}: ContactGridProps) {
  const sections = groupByLetter(contacts, sortField);

  return (
    <Grid
      isLoading={isLoading}
      columns={5}
      fit={Grid.Fit.Contain}
      navigationTitle="Search Contacts"
      searchBarPlaceholder="Filter contacts..."
      searchBarAccessory={<ViewModeDropdown value={viewMode} onChange={onViewModeChange} />}
    >
      <Grid.EmptyView
        title="No Contacts Found"
        description="Try a different search or create a new contact"
        icon={Icon.TwoPeople}
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
            const starred = isStarred(contact);

            return (
              <Grid.Item
                key={contact.resourceName}
                content={photoUrl ? { source: photoUrl, mask: Image.Mask.Circle } : getAvatarIcon(displayName)}
                title={displayName}
                subtitle={starred ? "⭐" : undefined}
                keywords={[
                  contact.names?.[0]?.givenName ?? "",
                  contact.names?.[0]?.familyName ?? "",
                  email ?? "",
                  contact.organizations?.[0]?.name ?? "",
                ]}
                actions={
                  <ContactActions
                    contact={contact}
                    groups={groups}
                    viewMode={viewMode}
                    sortField={sortField}
                    selectedGroup={selectedGroup}
                    onViewModeChange={onViewModeChange}
                    onSortFieldChange={onSortFieldChange}
                    onContactDeleted={onContactDeleted}
                    onContactUpdated={onContactUpdated}
                    onRefresh={onRefresh}
                    onFilterByGroup={onFilterByGroup}
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
