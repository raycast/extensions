import {
  Action,
  ActionPanel,
  Clipboard,
  Icon,
  List,
  open,
  showToast,
  Toast,
  Keyboard,
  getPreferenceValues,
  openExtensionPreferences,
} from "@raycast/api";
import { useEffect, useState } from "react";

const apiBaseURL = "http://127.0.0.1:47631/v2";

type LauncherPreferences = { integrationAccessKey: string };

function authenticatedRequest(signal: AbortSignal) {
  const { integrationAccessKey } = getPreferenceValues<LauncherPreferences>();
  return {
    signal,
    cache: "no-store" as const,
    headers: { Authorization: `Bearer ${integrationAccessKey}` },
  };
}

type Contact = {
  id: string;
  name: string;
  subtitle: string;
  email?: string;
  phone?: string;
  url: string;
};
type SearchResponse = { version: number; contacts: Contact[] };

type ContactFieldKind =
  | "text"
  | "name"
  | "organization"
  | "email"
  | "phone"
  | "address"
  | "url"
  | "date"
  | "relationship"
  | "message"
  | "social"
  | "note"
  | "account";

type ContactField = {
  id: string;
  section: string;
  label: string;
  value: string;
  kind: ContactFieldKind;
};

type ContactDetail = {
  id: string;
  name: string;
  subtitle: string;
  url: string;
  fields: ContactField[];
};
type ContactResponse = { version: number; contact: ContactDetail };

export default function SearchContacts() {
  const [query, setQuery] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [available, setAvailable] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `${apiBaseURL}/search?q=${encodeURIComponent(query)}`,
          authenticatedRequest(controller.signal),
        );
        if (!response.ok) throw new Error(String(response.status));
        const value = (await response.json()) as SearchResponse;
        if (value.version !== 2)
          throw new Error("Unsupported People integration API");
        setContacts(value.contacts.slice(0, 50));
        setAvailable(true);
      } catch {
        if (!controller.signal.aborted) {
          setContacts([]);
          setAvailable(false);
        }
      } finally {
        setLoading(false);
      }
    }, 80);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return (
    <List
      isLoading={loading}
      onSearchTextChange={setQuery}
      throttle={false}
      searchBarPlaceholder="Search People…"
    >
      {!available ? (
        <List.EmptyView
          icon={Icon.Person}
          title="People is unavailable"
          description="Open the app and confirm the Raycast access key in extension preferences."
          actions={
            <ActionPanel>
              <Action
                title="Open People"
                onAction={() => open("contactsplus://")}
              />
              <Action
                title="Open Extension Preferences"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      ) : (
        contacts.map((contact) => (
          <List.Item
            key={contact.id}
            icon={Icon.PersonCircle}
            title={contact.name}
            subtitle={contact.subtitle}
            accessories={contact.email ? [{ text: contact.email }] : []}
            actions={<ContactActions contact={contact} />}
          />
        ))
      )}
    </List>
  );
}

function ContactActions({ contact }: { contact: Contact }) {
  return (
    <ActionPanel>
      <Action.Push
        title="View Contact"
        icon={Icon.PersonLines}
        target={<ContactFields contact={contact} />}
      />
      <Action
        title="Open in People"
        icon={Icon.ArrowRight}
        onAction={() => open(contact.url)}
      />
      {contact.email && (
        <Action
          title="Copy Email"
          icon={Icon.Clipboard}
          shortcut={Keyboard.Shortcut.Common.Copy}
          onAction={() => copyValue(contact.email!, "Email")}
        />
      )}
      {contact.phone && (
        <Action
          title="Copy Phone"
          icon={Icon.Phone}
          onAction={() => copyValue(contact.phone!, "Phone")}
        />
      )}
      {contact.email && (
        <Action
          title="Compose Email"
          icon={Icon.Envelope}
          onAction={() => open(`mailto:${contact.email}`)}
        />
      )}
      {contact.phone && (
        <Action
          title="Call"
          icon={Icon.Phone}
          onAction={() => open(`tel:${contact.phone}`)}
        />
      )}
    </ActionPanel>
  );
}

function ContactFields({ contact: summary }: { contact: Contact }) {
  const [contact, setContact] = useState<ContactDetail>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    async function loadContact() {
      setLoading(true);
      setError(false);
      try {
        const response = await fetch(
          `${apiBaseURL}/contact?id=${encodeURIComponent(summary.id)}`,
          authenticatedRequest(controller.signal),
        );
        if (!response.ok) throw new Error(String(response.status));
        const value = (await response.json()) as ContactResponse;
        if (value.version !== 2)
          throw new Error("Unsupported People integration API");
        setContact(value.contact);
      } catch {
        if (!controller.signal.aborted) setError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void loadContact();
    return () => controller.abort();
  }, [summary.id]);

  const sections = contact
    ? [...new Set(contact.fields.map((field) => field.section))]
    : [];

  return (
    <List
      isLoading={loading}
      navigationTitle={contact?.name ?? summary.name}
      searchBarPlaceholder="Filter contact fields…"
      filtering={{ keepSectionOrder: true }}
    >
      {error ? (
        <List.EmptyView
          icon={Icon.Person}
          title="Contact details are unavailable"
          description="Open the app and confirm the Raycast access key in extension preferences."
          actions={
            <ActionPanel>
              <Action title="Open People" onAction={() => open(summary.url)} />
              <Action
                title="Open Extension Preferences"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      ) : (
        sections.map((section) => (
          <List.Section key={section} title={section}>
            {contact?.fields
              .filter((field) => field.section === section)
              .map((field) => (
                <List.Item
                  key={field.id}
                  icon={iconForField(field.kind)}
                  title={field.value}
                  subtitle={field.label}
                  keywords={[field.label, field.kind]}
                  actions={<FieldActions field={field} contact={contact} />}
                />
              ))}
          </List.Section>
        ))
      )}
    </List>
  );
}

function FieldActions({
  field,
  contact,
}: {
  field: ContactField;
  contact: ContactDetail;
}) {
  const label = titleCase(field.label);
  return (
    <ActionPanel>
      <Action
        title={`Copy ${label}`}
        icon={Icon.Clipboard}
        shortcut={Keyboard.Shortcut.Common.Copy}
        onAction={() => copyValue(field.value, label)}
      />
      {field.kind === "email" && (
        <Action
          title="Compose Email"
          icon={Icon.Envelope}
          onAction={() => open(`mailto:${field.value}`)}
        />
      )}
      {field.kind === "phone" && (
        <Action
          title="Call"
          icon={Icon.Phone}
          onAction={() => open(`tel:${field.value}`)}
        />
      )}
      {field.kind === "url" && (
        <Action
          title="Open Link"
          icon={Icon.Globe}
          onAction={() => open(normalizedURL(field.value))}
        />
      )}
      {field.kind === "address" && (
        <Action
          title="Open in Maps"
          icon={Icon.Map}
          onAction={() =>
            open(`https://maps.apple.com/?q=${encodeURIComponent(field.value)}`)
          }
        />
      )}
      <Action
        title="Open in People"
        icon={Icon.ArrowRight}
        onAction={() => open(contact.url)}
      />
    </ActionPanel>
  );
}

async function copyValue(value: string, label: string) {
  await Clipboard.copy(value);
  await showToast({ style: Toast.Style.Success, title: `${label} copied` });
}

function normalizedURL(value: string) {
  return /^[a-z][a-z\d+.-]*:/i.test(value) ? value : `https://${value}`;
}

function titleCase(value: string) {
  return value.replace(/\b\w/g, (character) => character.toUpperCase());
}

function iconForField(kind: ContactFieldKind) {
  switch (kind) {
    case "name":
    case "relationship":
      return Icon.Person;
    case "organization":
      return Icon.Building;
    case "email":
      return Icon.Envelope;
    case "phone":
      return Icon.Phone;
    case "address":
      return Icon.Map;
    case "url":
    case "social":
      return Icon.Link;
    case "date":
      return Icon.Calendar;
    case "message":
      return Icon.Message;
    case "note":
      return Icon.TextDocument;
    case "account":
      return Icon.PersonLines;
    default:
      return Icon.Text;
  }
}
