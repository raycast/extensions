import { Action, ActionPanel, Color, Icon, List, showToast, Toast, Keyboard } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import type { Contact, Relation, Thirdparty } from "./api/types";
import { contactUrl, thirdpartyUrl } from "./api/urls";
import { CompanyDetail } from "./components/CompanyDetail";
import { ErrorView } from "./components/ErrorView";
import { search } from "./index/fuzzy";
import { CONTACT_FIELDS, THIRDPARTY_FIELDS } from "./index/loadIndex";
import { useSearchIndex } from "./index/useSearchIndex";
import { getWebBaseUrl } from "./preferences";
import { COPY_PHONE, OPEN_IN_BROWSER } from "./shortcuts";

const RELATION_TAG: Record<Relation, { text: string; color: Color } | null> = {
  customer: { text: "Customer", color: Color.Green },
  prospect: { text: "Prospect", color: Color.Blue },
  both: { text: "Customer & Prospect", color: Color.Green },
  none: null,
};

export default function Command() {
  const { index, isLoading, isStale, error, revalidate } = useSearchIndex();
  const [query, setQuery] = useState("");
  const web = useMemo(() => getWebBaseUrl(), []);
  const companyById = useMemo(() => new Map((index?.thirdparties ?? []).map((t) => [t.id, t])), [index]);

  // A failed refresh must not hide results that are already usable.
  useEffect(() => {
    if (error && index !== null) {
      showToast({ style: Toast.Style.Failure, title: "Index not refreshed", message: error.message });
    }
  }, [error, index]);

  // Every hook must run before this early return — React forbids conditional hook calls.
  if (error && index === null) {
    return <ErrorView error={error} onRetry={revalidate} />;
  }

  // An empty query means "show nothing yet", not "show the first 50 records".
  const trimmed = query.trim();
  const companies = index && trimmed.length > 0 ? search(index.thirdparties, THIRDPARTY_FIELDS, trimmed) : [];
  const contacts = index && trimmed.length > 0 ? search(index.contacts, CONTACT_FIELDS, trimmed) : [];

  return (
    <List
      isLoading={isLoading || isStale}
      filtering={false}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search companies and contacts"
      throttle
    >
      {trimmed.length === 0 ? (
        <List.EmptyView icon={Icon.MagnifyingGlass} title="Start typing to find companies and contacts" />
      ) : null}

      <List.Section title="Companies" subtitle={companies.length > 0 ? String(companies.length) : undefined}>
        {companies.map((company) => (
          <CompanyItem key={`c-${company.id}`} company={company} web={web} />
        ))}
      </List.Section>

      <List.Section title="Contacts" subtitle={contacts.length > 0 ? String(contacts.length) : undefined}>
        {contacts.map((contact) => (
          <ContactItem
            key={`p-${contact.id}`}
            contact={contact}
            company={contact.thirdpartyId ? companyById.get(contact.thirdpartyId) : undefined}
            web={web}
          />
        ))}
      </List.Section>
    </List>
  );
}

function CompanyItem({ company, web }: { company: Thirdparty; web: string }) {
  const tag = RELATION_TAG[company.relation];
  return (
    <List.Item
      icon={Icon.Building}
      title={company.name}
      subtitle={company.nameAlias ?? undefined}
      accessories={[
        ...(company.customerCode ? [{ text: company.customerCode }] : []),
        ...(tag ? [{ tag: { value: tag.text, color: tag.color } }] : []),
      ]}
      actions={
        <ActionPanel>
          <Action.Push title="Show Details" icon={Icon.Sidebar} target={<CompanyDetail company={company} />} />
          <Action.OpenInBrowser
            title="Open in Dolibarr"
            url={thirdpartyUrl(web, company.id)}
            shortcut={OPEN_IN_BROWSER}
          />
          {company.email ? (
            <Action.CopyToClipboard
              title="Copy Email"
              content={company.email}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
          ) : null}
          {company.phone ? (
            <Action.CopyToClipboard title="Copy Phone Number" content={company.phone} shortcut={COPY_PHONE} />
          ) : null}
        </ActionPanel>
      }
    />
  );
}

function ContactItem({ contact, company, web }: { contact: Contact; company: Thirdparty | undefined; web: string }) {
  const name = [contact.firstname, contact.lastname].filter(Boolean).join(" ");
  const phone = contact.phonePro ?? contact.phoneMobile;
  return (
    <List.Item
      icon={Icon.Person}
      title={name}
      subtitle={contact.position ?? undefined}
      accessories={[{ text: company?.name ?? "No company" }]}
      actions={
        <ActionPanel>
          {company ? (
            <Action.Push title="Show Company" icon={Icon.Sidebar} target={<CompanyDetail company={company} />} />
          ) : null}
          <Action.OpenInBrowser
            title="Open Contact in Dolibarr"
            url={contactUrl(web, contact.id)}
            shortcut={OPEN_IN_BROWSER}
          />
          {contact.email ? (
            <Action.CopyToClipboard
              title="Copy Email"
              content={contact.email}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
          ) : null}
          {phone ? <Action.CopyToClipboard title="Copy Phone Number" content={phone} shortcut={COPY_PHONE} /> : null}
        </ActionPanel>
      }
    />
  );
}
