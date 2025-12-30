import { Action, ActionPanel, Alert, confirmAlert, Icon, List, Clipboard, open, showToast, Toast } from "@raycast/api";
import { getAvatarIcon, useCachedPromise } from "@raycast/utils";
import { Contact, listContacts, getContact, getDisplayName, syncContacts, deleteContact } from "./contacts-jxa";
import { ensureBinary } from "./binary-manager";
import { DEMO_MODE, DEMO_CONTACTS } from "./demo-contacts";

function ContactItemDetail({ contact }: { contact: Contact }) {
  // Fetch full contact details (with phone/email and thumbnail) when viewing detail
  // In demo mode, skip the API call and use the contact directly
  const { data: fullContact } = useCachedPromise(
    async (id: string) => {
      if (DEMO_MODE) {
        return DEMO_CONTACTS.find((c) => c.identifier === id) || null;
      }
      const result = getContact(id);
      return result.contact;
    },
    [contact.identifier],
    { initialData: contact },
  );

  const c = fullContact || contact;
  const metadata: React.ReactNode[] = [];

  if (c.organizationName) {
    metadata.push(<List.Item.Detail.Metadata.Label key="org" title="Organization" text={c.organizationName} />);
  }
  if (c.jobTitle) {
    metadata.push(<List.Item.Detail.Metadata.Label key="job" title="Job Title" text={c.jobTitle} />);
  }
  if (c.birthday) {
    metadata.push(<List.Item.Detail.Metadata.Label key="bday" title="Birthday" text={c.birthday} />);
  }

  if (c.phoneNumbers.length > 0) {
    metadata.push(<List.Item.Detail.Metadata.Separator key="phone-sep" />);
    for (const phone of c.phoneNumbers) {
      metadata.push(
        <List.Item.Detail.Metadata.Label
          key={`phone-${phone.value}`}
          title={phone.label || "Phone"}
          text={phone.value}
        />,
      );
    }
  }

  if (c.emailAddresses.length > 0) {
    metadata.push(<List.Item.Detail.Metadata.Separator key="email-sep" />);
    for (const email of c.emailAddresses) {
      metadata.push(
        <List.Item.Detail.Metadata.Link
          key={`email-${email.value}`}
          title={email.label || "Email"}
          text={email.value}
          target={`mailto:${email.value}`}
        />,
      );
    }
  }

  if (c.postalAddresses.length > 0) {
    metadata.push(<List.Item.Detail.Metadata.Separator key="addr-sep" />);
    for (const addr of c.postalAddresses) {
      const parts = [addr.street, addr.city, addr.state, addr.postalCode, addr.country].filter(Boolean);
      metadata.push(
        <List.Item.Detail.Metadata.Label
          key={`addr-${parts.join("-")}`}
          title={addr.label || "Address"}
          text={parts.join(", ")}
        />,
      );
    }
  }

  return (
    <List.Item.Detail
      metadata={metadata.length > 0 ? <List.Item.Detail.Metadata>{metadata}</List.Item.Detail.Metadata> : undefined}
    />
  );
}

function ContactListItem({ contact, onRefresh }: { contact: Contact; onRefresh: () => void }) {
  const displayName = getDisplayName(contact);

  // Build accessories to show key info at a glance
  const accessories: List.Item.Accessory[] = [];

  if (contact.phoneNumbers.length > 0) {
    accessories.push({
      icon: Icon.Phone,
      tooltip: `${contact.phoneNumbers[0].label || "Phone"}: ${contact.phoneNumbers[0].value}`,
    });
  }

  if (contact.emailAddresses.length > 0) {
    accessories.push({
      icon: Icon.Envelope,
      tooltip: contact.emailAddresses[0].value,
    });
  }

  return (
    <List.Item
      id={contact.identifier}
      icon={getAvatarIcon(displayName)}
      title={displayName}
      subtitle={contact.jobTitle || undefined}
      keywords={[
        contact.nickname,
        contact.organizationName,
        contact.jobTitle,
        ...contact.emailAddresses.map((e) => e.value),
        ...contact.phoneNumbers.map((p) => p.value),
      ].filter(Boolean)}
      accessories={accessories}
      detail={<ContactItemDetail contact={contact} />}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Quick Actions">
            {contact.phoneNumbers.length === 1 && (
              <Action
                title={`Call ${contact.phoneNumbers[0].value}`}
                icon={Icon.Phone}
                onAction={() => open(`tel:${contact.phoneNumbers[0].value}`)}
              />
            )}
            {contact.phoneNumbers.length > 1 && (
              <ActionPanel.Submenu title="Call…" icon={Icon.Phone}>
                {contact.phoneNumbers.map((phone, idx) => (
                  <Action
                    key={`call-${idx}`}
                    title={`${phone.label || "Phone"}: ${phone.value}`}
                    icon={Icon.Phone}
                    onAction={() => open(`tel:${phone.value}`)}
                  />
                ))}
              </ActionPanel.Submenu>
            )}
            {contact.emailAddresses.length === 1 && (
              <Action
                title={`Email ${contact.emailAddresses[0].value}`}
                icon={Icon.Envelope}
                onAction={() => open(`mailto:${contact.emailAddresses[0].value}`)}
              />
            )}
            {contact.emailAddresses.length > 1 && (
              <ActionPanel.Submenu title="Email…" icon={Icon.Envelope}>
                {contact.emailAddresses.map((email, idx) => (
                  <Action
                    key={`email-${idx}`}
                    title={`${email.label || "Email"}: ${email.value}`}
                    icon={Icon.Envelope}
                    onAction={() => open(`mailto:${email.value}`)}
                  />
                ))}
              </ActionPanel.Submenu>
            )}
            <Action
              title="Open in Contacts"
              icon={Icon.Person}
              onAction={() => open(`addressbook://${contact.identifier}`)}
            />
            {contact.postalAddresses.length === 1 && (
              <Action
                title="Open in Maps"
                icon={Icon.Map}
                shortcut={{ modifiers: ["cmd"], key: "m" }}
                onAction={() => {
                  const addr = contact.postalAddresses[0];
                  const query = [addr.street, addr.city, addr.state, addr.postalCode, addr.country]
                    .filter(Boolean)
                    .join(", ");
                  open(`maps://?q=${encodeURIComponent(query)}`);
                }}
              />
            )}
            {contact.postalAddresses.length > 1 && (
              <ActionPanel.Submenu title="Open in Maps…" icon={Icon.Map} shortcut={{ modifiers: ["cmd"], key: "m" }}>
                {contact.postalAddresses.map((addr, idx) => {
                  const parts = [addr.street, addr.city, addr.state, addr.postalCode, addr.country].filter(Boolean);
                  const query = parts.join(", ");
                  return (
                    <Action
                      key={`map-${idx}`}
                      title={addr.label || `Address ${idx + 1}`}
                      icon={Icon.Map}
                      onAction={() => open(`maps://?q=${encodeURIComponent(query)}`)}
                    />
                  );
                })}
              </ActionPanel.Submenu>
            )}
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            {contact.phoneNumbers.length === 1 && (
              <Action
                title="Copy Phone Number"
                icon={Icon.Clipboard}
                shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                onAction={() => Clipboard.copy(contact.phoneNumbers[0].value)}
              />
            )}
            {contact.phoneNumbers.length > 1 && (
              <ActionPanel.Submenu
                title="Copy Phone Number…"
                icon={Icon.Clipboard}
                shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
              >
                {contact.phoneNumbers.map((phone, idx) => (
                  <Action
                    key={`copy-phone-${idx}`}
                    title={`${phone.label || "Phone"}: ${phone.value}`}
                    icon={Icon.Clipboard}
                    onAction={() => Clipboard.copy(phone.value)}
                  />
                ))}
              </ActionPanel.Submenu>
            )}
            {contact.emailAddresses.length === 1 && (
              <Action
                title="Copy Email"
                icon={Icon.Clipboard}
                shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
                onAction={() => Clipboard.copy(contact.emailAddresses[0].value)}
              />
            )}
            {contact.emailAddresses.length > 1 && (
              <ActionPanel.Submenu
                title="Copy Email…"
                icon={Icon.Clipboard}
                shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
              >
                {contact.emailAddresses.map((email, idx) => (
                  <Action
                    key={`copy-email-${idx}`}
                    title={`${email.label || "Email"}: ${email.value}`}
                    icon={Icon.Clipboard}
                    onAction={() => Clipboard.copy(email.value)}
                  />
                ))}
              </ActionPanel.Submenu>
            )}
          </ActionPanel.Section>
          <ActionPanel.Section title="Manage">
            <Action
              title="Refresh Contacts"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={async () => {
                await showToast({ style: Toast.Style.Animated, title: "Refreshing contacts..." });
                const result = syncContacts();
                if (result.error) {
                  await showToast({ style: Toast.Style.Failure, title: "Failed to refresh", message: result.error });
                } else {
                  await showToast({ style: Toast.Style.Success, title: "Contacts refreshed" });
                  onRefresh();
                }
              }}
            />
            <Action
              title="Delete Contact"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
              onAction={async () => {
                const confirmed = await confirmAlert({
                  title: "Delete Contact",
                  message: `Are you sure you want to delete "${displayName}"? This cannot be undone.`,
                  primaryAction: {
                    title: "Delete",
                    style: Alert.ActionStyle.Destructive,
                  },
                });
                if (confirmed) {
                  const result = deleteContact(contact.identifier);
                  if (result.success) {
                    await showToast({ style: Toast.Style.Success, title: "Contact deleted" });
                    onRefresh();
                  } else {
                    await showToast({ style: Toast.Style.Failure, title: "Failed to delete", message: result.error });
                  }
                }
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

async function fetchContacts(): Promise<Contact[]> {
  // Demo mode for screenshots - returns fake contacts
  if (DEMO_MODE) {
    return DEMO_CONTACTS;
  }

  // Ensure binary is downloaded on first run
  await ensureBinary();

  const result = await listContacts();
  if (result.error) {
    throw new Error(result.error);
  }
  return result.contacts;
}

export default function SearchContacts() {
  const {
    data: contacts,
    isLoading,
    revalidate,
  } = useCachedPromise(fetchContacts, [], {
    keepPreviousData: true,
  });

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Search contacts..."
      filtering={{ keepSectionOrder: true }}
    >
      {(contacts || []).map((contact) => (
        <ContactListItem key={contact.identifier} contact={contact} onRefresh={revalidate} />
      ))}
    </List>
  );
}
