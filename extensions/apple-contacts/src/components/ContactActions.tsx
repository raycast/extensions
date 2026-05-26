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
import { t } from "../i18n";
import { UnifiedContact } from "../types";
import ContactForm from "./ContactForm";

interface ContactActionsProps {
  contact: UnifiedContact;
  onRefresh: () => void;
  onContactDeleted: () => void;
}

export default function ContactActions({
  contact,
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
            title={t("action_compose_email")}
            icon={Icon.Envelope}
            target={`mailto:${primaryEmail}`}
          />
        )}
        {primaryPhone && (
          <Action.Open
            title={t("action_call")}
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
          title={t("action_open_in_contacts")}
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
            title={t("action_open_in_maps")}
            icon={Icon.Map}
            url={`https://maps.apple.com/?q=${encodeURIComponent(contact.addresses[0].formattedValue.replace(/\n/g, ", "))}`}
            shortcut={{ modifiers: ["cmd"], key: "m" }}
          />
        )}
      </ActionPanel.Section>

      <ActionPanel.Section title={t("section_copy")}>
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
          title={t("action_copy_name")}
          content={contact.displayName}
          shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action
          title={t("action_edit_contact")}
          icon={Icon.Pencil}
          shortcut={{ modifiers: ["cmd"], key: "e" }}
          onAction={() =>
            push(<ContactForm contact={contact} onSaved={onRefresh} />)
          }
        />
        <Action
          title={t("action_new_contact")}
          icon={Icon.PersonCircle}
          shortcut={{ modifiers: ["cmd"], key: "n" }}
          onAction={() => push(<ContactForm onSaved={onRefresh} />)}
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action
          title={t("action_refresh_contacts")}
          icon={Icon.ArrowClockwise}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={onRefresh}
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action
          title={t("action_delete_contact")}
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["ctrl"], key: "x" }}
          onAction={async () => {
            const confirmed = await confirmAlert({
              title: t("confirm_delete_title"),
              message: t("confirm_delete_message", {
                name: contact.displayName,
              }),
              primaryAction: {
                title: t("confirm_delete_button"),
                style: Alert.ActionStyle.Destructive,
              },
            });
            if (!confirmed) return;
            try {
              const appleId = contact.id.replace("apple:", "");
              await deleteAppleContact(appleId);
              await showToast({
                style: Toast.Style.Success,
                title: t("toast_contact_deleted"),
              });
              onContactDeleted();
            } catch (err) {
              await showToast({
                style: Toast.Style.Failure,
                title: t("toast_failed_delete_contact"),
                message: err instanceof Error ? err.message : String(err),
              });
            }
          }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function formatType(type: string | undefined): string {
  if (!type) return "";
  const clean = type.replace(/^_\$!<(.+)>!\$_$/, "$1");
  return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
}

function copyTitle(type: string | undefined, field: "phone" | "email"): string {
  const label = formatType(type);
  if (field === "phone") {
    return label ? t("copy_phone_labeled", { label }) : t("copy_phone");
  }
  return label ? t("copy_email_labeled", { label }) : t("copy_email");
}
