import { Action, ActionPanel, Icon, Image, List } from "@raycast/api";
import { getAvatarIcon } from "@raycast/utils";
import {
  formatBirthday,
  getDisplayName,
  getPhotoUrl,
  getPrimaryEmail,
  getPrimaryPhone,
  groupByLetter,
  isStarred,
  SortField,
} from "../helpers";
import { ContactGroup, Person, ViewMode, VIEW_MODE_OPTIONS } from "../types";
import ContactActions from "./ContactActions";
import ContactForm from "./ContactForm";

interface ContactListProps {
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
    <List.Dropdown tooltip="View" storeValue value={value} onChange={onChange}>
      {VIEW_MODE_OPTIONS.map((opt) => (
        <List.Dropdown.Item key={opt.value} title={opt.title} value={opt.value} icon={opt.icon} />
      ))}
    </List.Dropdown>
  );
}

export default function ContactList({
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
}: ContactListProps) {
  const isDetail = viewMode === "detail";
  const sections = groupByLetter(contacts, sortField);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isDetail}
      navigationTitle="Search Contacts"
      searchBarPlaceholder="Filter contacts..."
      searchBarAccessory={<ViewModeDropdown value={viewMode} onChange={onViewModeChange} />}
    >
      <List.EmptyView
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
        <List.Section key={letter} title={letter}>
          {sectionContacts.map((contact) => {
            const displayName = getDisplayName(contact);
            const email = getPrimaryEmail(contact);
            const phone = getPrimaryPhone(contact);
            const photoUrl = getPhotoUrl(contact);
            const company = contact.organizations?.[0]?.name;
            const jobTitle = contact.organizations?.[0]?.title;
            const bio = contact.biographies?.[0]?.value;
            const birthday = formatBirthday(contact);
            const emails = contact.emailAddresses?.filter((e) => e.value) ?? [];
            const phones = contact.phoneNumbers?.filter((p) => p.value) ?? [];
            const addresses = contact.addresses?.filter((a) => a.formattedValue) ?? [];
            const starred = isStarred(contact);
            const groupNames =
              contact.memberships
                ?.filter((m) => m.contactGroupMembership?.contactGroupResourceName)
                .map((m) => {
                  const group = groups.find(
                    (g) => g.resourceName === m.contactGroupMembership?.contactGroupResourceName,
                  );
                  return group?.name;
                })
                .filter(Boolean) ?? [];

            return (
              <List.Item
                key={contact.resourceName}
                title={displayName}
                subtitle={isDetail ? "" : (company ?? "")}
                icon={photoUrl ? { source: photoUrl, mask: Image.Mask.Circle } : getAvatarIcon(displayName)}
                accessories={
                  isDetail
                    ? undefined
                    : [
                        ...(starred ? [{ icon: Icon.Star }] : []),
                        ...(email ? [{ text: email, icon: Icon.Envelope }] : []),
                        ...(phone ? [{ text: phone, icon: Icon.Phone }] : []),
                      ]
                }
                keywords={[
                  contact.names?.[0]?.givenName ?? "",
                  contact.names?.[0]?.familyName ?? "",
                  email ?? "",
                  phone ?? "",
                  company ?? "",
                ]}
                detail={
                  isDetail ? (
                    <List.Item.Detail
                      markdown={[
                        `## ${starred ? "⭐ " : ""}${displayName}`,
                        ...(company ? [`**${company}**`] : []),
                        ...(jobTitle ? [`*${jobTitle}*`] : []),
                      ].join("\n\n")}
                      metadata={
                        <List.Item.Detail.Metadata>
                          {phones.map((p) => (
                            <List.Item.Detail.Metadata.Link
                              key={p.value}
                              title={p.type || "phone"}
                              text={p.value!}
                              target={`tel:${p.value}`}
                            />
                          ))}
                          {emails.map((e) => (
                            <List.Item.Detail.Metadata.Link
                              key={e.value}
                              title={e.type || "email"}
                              text={e.value!}
                              target={`mailto:${e.value}`}
                            />
                          ))}
                          {addresses.map((a) => (
                            <List.Item.Detail.Metadata.Label
                              key={a.formattedValue}
                              title={a.type || "address"}
                              text={a.formattedValue!}
                            />
                          ))}
                          {birthday && <List.Item.Detail.Metadata.Label title="Birthday" text={birthday} />}
                          {(phones.length > 0 || emails.length > 0 || addresses.length > 0 || birthday) && (
                            <List.Item.Detail.Metadata.Separator />
                          )}
                          {bio && <List.Item.Detail.Metadata.Label title="Notes" text={bio} />}
                          {groupNames.length > 0 && (
                            <List.Item.Detail.Metadata.TagList title="Groups">
                              {groupNames.map((name) => (
                                <List.Item.Detail.Metadata.TagList.Item key={name} text={name!} />
                              ))}
                            </List.Item.Detail.Metadata.TagList>
                          )}
                        </List.Item.Detail.Metadata>
                      }
                    />
                  ) : undefined
                }
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
        </List.Section>
      ))}
    </List>
  );
}
