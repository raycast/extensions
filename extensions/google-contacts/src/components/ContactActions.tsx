import { Action, ActionPanel, Alert, Icon, confirmAlert, showToast, Toast, useNavigation } from "@raycast/api";
import { getAccessToken } from "@raycast/utils";
import { deleteContact, getContact } from "../api";
import { getContactUrl, getDisplayName, getPrimaryEmail, getPrimaryPhone } from "../helpers";
import { Person } from "../types";
import { SortField } from "../helpers";
import { ViewMode } from "../search-contacts";
import ContactForm from "./ContactForm";

interface ContactActionsProps {
  contact: Person;
  viewMode: ViewMode;
  sortField: SortField;
  onViewModeChange: (value: string) => void;
  onSortFieldChange: (value: string) => void;
  onContactDeleted: () => void;
  onContactUpdated: () => void;
  onRefresh: () => void;
}

export default function ContactActions({
  contact,
  viewMode,
  sortField,
  onViewModeChange,
  onSortFieldChange,
  onContactDeleted,
  onContactUpdated,
  onRefresh,
}: ContactActionsProps) {
  const { push } = useNavigation();
  const displayName = getDisplayName(contact);
  const primaryEmail = getPrimaryEmail(contact);
  const primaryPhone = getPrimaryPhone(contact);
  const emails = contact.emailAddresses?.filter((e) => e.value) ?? [];
  const phones = contact.phoneNumbers?.filter((p) => p.value) ?? [];

  async function handleEdit() {
    try {
      const { token } = getAccessToken();
      const freshContact = await getContact(token, contact.resourceName);
      push(<ContactForm contact={freshContact} onSaved={onContactUpdated} />);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load contact",
        message: String(error),
      });
    }
  }

  async function handleDelete() {
    const confirmed = await confirmAlert({
      title: "Delete Contact",
      message: `Are you sure you want to delete ${displayName}?`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;

    try {
      const { token } = getAccessToken();
      await deleteContact(token, contact.resourceName);
      await showToast({ style: Toast.Style.Success, title: "Contact deleted" });
      onContactDeleted();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to delete contact",
        message: String(error),
      });
    }
  }

  const nextView: ViewMode = viewMode === "list" ? "detail" : viewMode === "detail" ? "grid" : "list";
  const nextViewLabel = nextView === "list" ? "List View" : nextView === "detail" ? "Detail View" : "Grid View";
  const nextViewIcon =
    nextView === "list"
      ? Icon.AppWindowList
      : nextView === "detail"
        ? Icon.AppWindowSidebarRight
        : Icon.AppWindowGrid3x3;

  const nextSort: SortField = sortField === "first" ? "last" : "first";
  const nextSortLabel = nextSort === "first" ? "Sort by First Name" : "Sort by Last Name";

  return (
    <ActionPanel>
      <ActionPanel.Section title="Contact">
        <Action
          title="Edit Contact"
          icon={Icon.Pencil}
          shortcut={{ modifiers: ["cmd"], key: "e" }}
          onAction={handleEdit}
        />
        <Action.OpenInBrowser
          title="Open in Google Contacts"
          url={getContactUrl(contact)}
          shortcut={{ modifiers: ["cmd"], key: "o" }}
        />
      </ActionPanel.Section>

      {(primaryEmail || primaryPhone) && (
        <ActionPanel.Section title="Reach Out">
          {primaryEmail && (
            <Action.Open
              title="Compose Email"
              icon={Icon.Envelope}
              target={`mailto:${primaryEmail}`}
              shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
            />
          )}
          {primaryPhone && (
            <Action.Open
              title="Call"
              icon={Icon.Phone}
              target={`tel:${primaryPhone}`}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          )}
        </ActionPanel.Section>
      )}

      {(emails.length > 0 || phones.length > 0) && (
        <ActionPanel.Section title="Copy">
          <Action.CopyToClipboard
            title="Copy Name"
            content={displayName}
            shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
          />
          {emails.map((e) => (
            <Action.CopyToClipboard
              key={e.value}
              title={`Copy Email${e.type ? ` (${e.type})` : ""}`}
              content={e.value!}
            />
          ))}
          {phones.map((p) => (
            <Action.CopyToClipboard
              key={p.value}
              title={`Copy Phone${p.type ? ` (${p.type})` : ""}`}
              content={p.value!}
            />
          ))}
        </ActionPanel.Section>
      )}

      <ActionPanel.Section>
        <Action
          title={nextSortLabel}
          icon={Icon.ArrowDownCircle}
          shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
          onAction={() => onSortFieldChange(nextSort)}
        />
        <Action
          title="Refresh Contacts"
          icon={Icon.ArrowClockwise}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={onRefresh}
        />
        <Action
          title={`Switch to ${nextViewLabel}`}
          icon={nextViewIcon}
          shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
          onAction={() => onViewModeChange(nextView)}
        />
        <Action
          title="Delete Contact"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["ctrl"], key: "x" }}
          onAction={handleDelete}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
