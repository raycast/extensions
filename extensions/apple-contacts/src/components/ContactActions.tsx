import {
  Action,
  ActionPanel,
  Icon,
  confirmAlert,
  Alert,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { deleteAppleContact } from "../apple-contacts";
import { formatType } from "../helpers";
import { UnifiedContact } from "../types";
import ContactForm from "./ContactForm";

interface ContactActionsProps {
  contact: UnifiedContact;
  isLoadingDetail?: boolean;
  onRefresh: () => void;
  onContactDeleted: () => void;
}

export default function ContactActions({
  contact,
  isLoadingDetail = false,
  onRefresh,
  onContactDeleted,
}: ContactActionsProps) {
  const { push } = useNavigation();
  const primaryEmail = contact.emails[0]?.value;
  const primaryPhone = contact.phones[0]?.value;

  return (
    <ActionPanel>
      <ActionPanel.Section>
        {/* Primary action priority: Compose Email > Call > Open in Contacts */}
        {primaryEmail && (
          <Action.Open
            title="Compose Email"
            icon={Icon.Envelope}
            target={`mailto:${primaryEmail}`}
          />
        )}
        {primaryPhone && (
          <Action.Open
            title="Call"
            icon={Icon.Phone}
            target={`tel:${primaryPhone}`}
            shortcut={
              primaryEmail
                ? { modifiers: ["cmd", "shift"], key: "c" }
                : undefined
            }
          />
        )}
        <Action.Open
          title="Open in Contacts"
          icon={Icon.TwoPeople}
          target="addressbook://"
          shortcut={
            primaryEmail || primaryPhone
              ? { modifiers: ["cmd"], key: "o" }
              : undefined
          }
        />
        {contact.addresses && contact.addresses.length > 0 && (
          <Action.OpenInBrowser
            title="Open in Maps"
            icon={Icon.Map}
            url={`https://maps.apple.com/?q=${encodeURIComponent(contact.addresses[0].formattedValue.replace(/\n/g, ", "))}`}
            shortcut={{ modifiers: ["cmd"], key: "m" }}
          />
        )}
      </ActionPanel.Section>

      <ActionPanel.Section title="Copy">
        {contact.phones.map((p, i) => (
          <Action.CopyToClipboard
            key={p.value}
            title={copyTitle(p.type, "phone")}
            content={p.value}
            shortcut={
              i === 0 ? { modifiers: ["cmd", "shift"], key: "p" } : undefined
            }
          />
        ))}
        {contact.emails.map((e) => (
          <Action.CopyToClipboard
            key={e.value}
            title={copyTitle(e.type, "email")}
            content={e.value}
          />
        ))}
        <Action.CopyToClipboard
          title="Copy Name"
          content={contact.displayName}
          shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action
          title="Edit Contact"
          icon={Icon.Pencil}
          shortcut={{ modifiers: ["cmd"], key: "e" }}
          onAction={async () => {
            if (isLoadingDetail) {
              await showToast({
                style: Toast.Style.Failure,
                title: "Contact details still loading",
                message: "Please wait a moment, then try again.",
              });
              return;
            }
            push(<ContactForm contact={contact} onSaved={onRefresh} />);
          }}
        />
        <Action
          title="New Contact"
          icon={Icon.PersonCircle}
          shortcut={{ modifiers: ["cmd"], key: "n" }}
          onAction={() => push(<ContactForm onSaved={onRefresh} />)}
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action
          title="Refresh Contacts"
          icon={Icon.ArrowClockwise}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={onRefresh}
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action
          title="Delete Contact"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["ctrl"], key: "x" }}
          onAction={async () => {
            const confirmed = await confirmAlert({
              title: "Delete Contact",
              message: `Are you sure you want to delete "${contact.displayName}"? This cannot be undone.`,
              primaryAction: {
                title: "Delete",
                style: Alert.ActionStyle.Destructive,
              },
            });
            if (!confirmed) return;
            try {
              const appleId = contact.id.replace("apple:", "");
              await deleteAppleContact(appleId);
              await showToast({
                style: Toast.Style.Success,
                title: "Contact deleted",
              });
              onContactDeleted();
            } catch (err) {
              await showToast({
                style: Toast.Style.Failure,
                title: "Failed to delete contact",
                message: err instanceof Error ? err.message : String(err),
              });
            }
          }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function copyTitle(type: string | undefined, field: "phone" | "email"): string {
  const label = formatType(type);
  if (field === "phone") {
    return label ? `Copy ${label} Phone` : "Copy Phone";
  }
  return label ? `Copy ${label} Email` : "Copy Email";
}
