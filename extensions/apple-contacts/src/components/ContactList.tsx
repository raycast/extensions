import {
  Action,
  ActionPanel,
  Icon,
  Image,
  List,
  useNavigation,
} from "@raycast/api";
import { getAvatarIcon, useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { fetchContactDetail } from "../apple-contacts";
import { formatBirthday, groupByLetter } from "../helpers";
import { useContactPhotos } from "../hooks";
import { t } from "../i18n";
import { ContactAddress, UnifiedContact } from "../types";
import ContactActions from "./ContactActions";
import ContactForm from "./ContactForm";

function formatType(type: string | undefined): string {
  if (!type) return "";
  const clean = type.replace(/^_\$!<(.+)>!\$_$/, "$1");
  return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
}

function formatAddress(a: ContactAddress): string {
  return a.formattedValue.replace(/\n/g, ", ");
}

function buildDetailMarkdown(
  c: UnifiedContact,
  subtitle: string | null,
): string {
  const nameLine = `# ${c.displayName}`;
  const subtitleLine = subtitle ? `\n*${subtitle}*` : "";
  const notesSection = c.notes ? `\n\n## Notes\n\n${c.notes}` : "";
  return `${nameLine}${subtitleLine}${notesSection}`;
}

function phoneToE164(phone: string): string {
  return phone.replace(/[^\d+]/g, "");
}

function addressToMapsUrl(formatted: string): string {
  return `https://maps.apple.com/?q=${encodeURIComponent(formatted)}`;
}

interface ContactListProps {
  contacts: UnifiedContact[];
  isLoading: boolean;
  onRefresh: () => void;
}

function filterContacts(
  contacts: UnifiedContact[],
  query: string,
): UnifiedContact[] {
  const q = query.trim().toLowerCase();
  if (!q) return contacts;
  return contacts.filter((c) => {
    if (c.displayName.toLowerCase().includes(q)) return true;
    if (c.company?.toLowerCase().includes(q)) return true;
    if (c.phones.some((p) => p.value.toLowerCase().includes(q))) return true;
    if (c.emails.some((e) => e.value.toLowerCase().includes(q))) return true;
    return false;
  });
}

export default function ContactList({
  contacts,
  isLoading,
  onRefresh,
}: ContactListProps) {
  const { push } = useNavigation();
  const [searchText, setSearchText] = useState("");
  const filteredContacts = filterContacts(contacts, searchText);
  const sections = groupByLetter(filteredContacts);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedContact = contacts.find((c) => c.id === selectedId) ?? null;

  const { data: detailContact, isLoading: isLoadingDetail } = useCachedPromise(
    fetchContactDetail,

    [selectedContact!],
    {
      keepPreviousData: true,
      execute: selectedContact !== null,
    },
  );

  // Eagerly loaded photo map: id → data URL. Starts loading in the background
  // right after the component mounts so avatars are ready without selecting.
  const { data: photoMap } = useContactPhotos();

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      filtering={false}
      searchBarPlaceholder={t("search_contacts_placeholder")}
      onSearchTextChange={setSearchText}
      onSelectionChange={(id) => setSelectedId(id ?? null)}
    >
      <List.EmptyView
        title={isLoading ? t("loading_contacts") : t("no_contacts_found")}
        description={isLoading ? undefined : t("no_contacts_description")}
        icon={Icon.TwoPeople}
        actions={
          !isLoading ? (
            <ActionPanel>
              <Action
                title={t("action_new_contact")}
                icon={Icon.PersonCircle}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                onAction={() => push(<ContactForm onSaved={onRefresh} />)}
              />
              <Action.Open
                title={t("action_open_contacts_app")}
                icon={Icon.TwoPeople}
                target="addressbook://"
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
              <Action
                title={t("action_refresh")}
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={onRefresh}
              />
            </ActionPanel>
          ) : undefined
        }
      />
      {sections.map(([letter, sectionContacts]) => (
        <List.Section
          key={letter}
          title={letter}
          subtitle={`${sectionContacts.length}`}
        >
          {sectionContacts.map((contact) => {
            const isSelected = contact.id === selectedId;
            const displayContact =
              isSelected && detailContact ? detailContact : contact;

            const photoUrl =
              displayContact.photoUrl ??
              contact.photoUrl ??
              photoMap?.[contact.id];
            const icon = photoUrl
              ? { source: photoUrl, mask: Image.Mask.Circle }
              : getAvatarIcon(contact.displayName);

            return (
              <List.Item
                key={contact.id}
                id={contact.id}
                title={contact.displayName}
                icon={icon}
                keywords={[
                  contact.firstName ?? "",
                  contact.lastName ?? "",
                  contact.company ?? "",
                  ...contact.phones.map((p) => p.value),
                  ...contact.emails.map((e) => e.value),
                ]}
                detail={(() => {
                  const phones = displayContact.phones ?? [];
                  const emails = displayContact.emails ?? [];
                  const addresses = displayContact.addresses ?? [];
                  const birthday = formatBirthday(displayContact.birthday);

                  const subtitle =
                    displayContact.jobTitle || displayContact.company
                      ? [displayContact.jobTitle, displayContact.company]
                          .filter(Boolean)
                          .join(t("subtitle_at"))
                      : null;

                  return (
                    <List.Item.Detail
                      markdown={buildDetailMarkdown(displayContact, subtitle)}
                      isLoading={isSelected && isLoadingDetail}
                      metadata={
                        <List.Item.Detail.Metadata>
                          {phones.map((p, i) => (
                            <List.Item.Detail.Metadata.Link
                              key={i}
                              title={i === 0 ? t("label_phone") : ""}
                              text={`${p.value}${p.type ? `  (${formatType(p.type)})` : ""}`}
                              target={`tel:${phoneToE164(p.value)}`}
                            />
                          ))}

                          {phones.length > 0 && emails.length > 0 && (
                            <List.Item.Detail.Metadata.Separator />
                          )}

                          {emails.map((e, i) => (
                            <List.Item.Detail.Metadata.Link
                              key={i}
                              title={i === 0 ? t("label_email") : ""}
                              text={`${e.value}${e.type ? `  (${formatType(e.type)})` : ""}`}
                              target={`mailto:${e.value}`}
                            />
                          ))}

                          {addresses.length > 0 &&
                            (emails.length > 0 || phones.length > 0) && (
                              <List.Item.Detail.Metadata.Separator />
                            )}
                          {addresses.map((a, i) => (
                            <List.Item.Detail.Metadata.Link
                              key={i}
                              title={i === 0 ? t("label_address") : ""}
                              text={`${formatAddress(a)}${a.type ? `  (${formatType(a.type)})` : ""}`}
                              target={addressToMapsUrl(formatAddress(a))}
                            />
                          ))}

                          {birthday && <List.Item.Detail.Metadata.Separator />}
                          {birthday && (
                            <List.Item.Detail.Metadata.Label
                              title={t("label_birthday")}
                              text={birthday}
                              icon={Icon.Calendar}
                            />
                          )}
                        </List.Item.Detail.Metadata>
                      }
                    />
                  );
                })()}
                actions={
                  <ContactActions
                    contact={displayContact}
                    onRefresh={onRefresh}
                    onContactDeleted={onRefresh}
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
