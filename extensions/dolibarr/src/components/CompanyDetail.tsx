import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useMemo, useState, type ReactNode } from "react";
import { createClient } from "../api/client";
import { fetchCompanyContacts } from "../api/contacts";
import { downloadDocumentPdf, fetchInvoices, fetchOrders, fetchProposals } from "../api/documents";
import { fetchThirdparty } from "../api/thirdparties";
import type { Contact, DocumentStatus, DocumentSummary, Thirdparty } from "../api/types";
import { contactUrl, documentUrl, thirdpartyUrl } from "../api/urls";
import { formatMoney, formatShortDate } from "../format";
import { isMacOS } from "../platform";
import { getConfig, getDisplayLocale, getWebBaseUrl } from "../preferences";
import { storePdf } from "../pdfStore";
import { OPEN_IN_BROWSER, QUICK_LOOK, TOGGLE_DETAIL } from "../shortcuts";
import { telUrl } from "../telephone";
import { ContactDetail } from "./ContactDetail";
import { DocumentDetail } from "./DocumentDetail";
import { CompanyPanel } from "./panels/CompanyPanel";
import { ContactPanel } from "./panels/ContactPanel";
import { DocumentPanel } from "./panels/DocumentPanel";

const TONE_COLOR: Record<DocumentStatus["tone"], Color> = {
  neutral: Color.SecondaryText,
  open: Color.Blue,
  positive: Color.Green,
  negative: Color.Red,
  // Orange, not red: an expired proposal wants following up, it is not money missing.
  warning: Color.Orange,
};

const KIND_ICON: Record<DocumentSummary["kind"], Icon> = {
  proposal: Icon.Document,
  order: Icon.Box,
  invoice: Icon.Receipt,
};

/** Stable list-item id, also the key under which a downloaded PDF is remembered. */
function itemId(document: DocumentSummary): string {
  return `${document.kind}-${document.id}`;
}

export function CompanyDetail({ company }: { company: Thirdparty }) {
  const web = useMemo(() => getWebBaseUrl(), []);
  const locale = useMemo(() => getDisplayLocale(), []);
  const [showDetail, setShowDetail] = useState(false);
  const [pdfPaths, setPdfPaths] = useState<Record<string, string>>({});

  const { data, isLoading } = usePromise(
    async (id: number) => {
      const client = createClient(getConfig());
      // Master data and contacts may fail on their own without taking the whole view down.
      const [detail, contacts, proposals, orders, invoices] = await Promise.all([
        fetchThirdparty(client, id).catch(() => undefined),
        fetchCompanyContacts(client, id).catch(() => [] as Contact[]),
        fetchProposals(client, id),
        fetchOrders(client, id),
        fetchInvoices(client, id),
      ]);
      return { detail, contacts, proposals, orders, invoices };
    },
    [company.id],
  );

  const documents = useMemo(
    () => [...(data?.proposals ?? []), ...(data?.orders ?? []), ...(data?.invoices ?? [])],
    [data],
  );

  async function prepareQuickLook(selectedId: string | null) {
    if (!selectedId || pdfPaths[selectedId]) return;
    const document = documents.find((candidate) => itemId(candidate) === selectedId);
    if (!document) return;

    try {
      const bytes = await downloadDocumentPdf(createClient(getConfig()), document.kind, document.ref);
      const path = await storePdf(document.ref, bytes);
      setPdfPaths((previous) => ({ ...previous, [selectedId]: path }));
    } catch {
      // Drafts often have no generated PDF. The preview simply stays unavailable for that row.
    }
  }

  const toggleDetail = (
    <Action
      title="Toggle Details"
      icon={Icon.Sidebar}
      shortcut={TOGGLE_DETAIL}
      onAction={() => setShowDetail((shown) => !shown)}
    />
  );
  const subtitle = [company.email, company.phone].filter(Boolean).join(" · ");

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showDetail}
      navigationTitle={company.name}
      searchBarPlaceholder="Filter contacts and documents"
      onSelectionChange={prepareQuickLook}
    >
      <List.Section title="Company">
        <List.Item
          id="company"
          icon={Icon.Building}
          title={company.name}
          subtitle={showDetail || subtitle.length === 0 ? undefined : subtitle}
          detail={<CompanyPanel detail={data?.detail} isLoading={isLoading} />}
          actions={
            <ActionPanel>
              {toggleDetail}
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
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Contacts" subtitle={data ? String(data.contacts.length) : undefined}>
        {(data?.contacts ?? []).map((contact) => (
          <ContactRow key={`contact-${contact.id}`} contact={contact} web={web} toggleDetail={toggleDetail} />
        ))}
      </List.Section>

      <DocumentSection
        title="Proposals"
        documents={data?.proposals ?? []}
        web={web}
        isLoading={isLoading}
        pdfPaths={pdfPaths}
        locale={locale}
        showDetail={showDetail}
        toggleDetail={toggleDetail}
      />
      <DocumentSection
        title="Orders"
        documents={data?.orders ?? []}
        web={web}
        isLoading={isLoading}
        pdfPaths={pdfPaths}
        locale={locale}
        showDetail={showDetail}
        toggleDetail={toggleDetail}
      />
      <DocumentSection
        title="Invoices"
        documents={data?.invoices ?? []}
        web={web}
        isLoading={isLoading}
        pdfPaths={pdfPaths}
        locale={locale}
        showDetail={showDetail}
        toggleDetail={toggleDetail}
      />
    </List>
  );
}

function ContactRow({ contact, web, toggleDetail }: { contact: Contact; web: string; toggleDetail: ReactNode }) {
  const name = [contact.firstname, contact.lastname].filter(Boolean).join(" ");
  const landline = telUrl(contact.phonePro);
  const mobile = telUrl(contact.phoneMobile);

  return (
    <List.Item
      id={`contact-${contact.id}`}
      icon={Icon.Person}
      title={name}
      subtitle={contact.position ?? undefined}
      detail={<ContactPanel contact={contact} />}
      actions={
        <ActionPanel>
          <Action.Push
            title="Show Contact"
            icon={Icon.Sidebar}
            target={<ContactDetail contactId={contact.id} fallbackName={name} />}
          />
          {landline ? <Action.Open title="Call Landline" icon={Icon.Phone} target={landline} /> : null}
          {mobile ? <Action.Open title="Call Mobile" icon={Icon.Phone} target={mobile} /> : null}
          {toggleDetail}
          <Action.OpenInBrowser title="Open in Dolibarr" url={contactUrl(web, contact.id)} shortcut={OPEN_IN_BROWSER} />
        </ActionPanel>
      }
    />
  );
}

function DocumentSection({
  title,
  documents,
  web,
  isLoading,
  pdfPaths,
  locale,
  showDetail,
  toggleDetail,
}: {
  title: string;
  documents: DocumentSummary[];
  web: string;
  isLoading: boolean;
  pdfPaths: Record<string, string>;
  locale: string;
  showDetail: boolean;
  toggleDetail: ReactNode;
}) {
  if (!isLoading && documents.length === 0) {
    return (
      <List.Section title={title}>
        <List.Item icon={Icon.Dot} title={`No ${title.toLowerCase()}`} />
      </List.Section>
    );
  }

  return (
    <List.Section title={title} subtitle={documents.length > 0 ? String(documents.length) : undefined}>
      {documents.map((document) => (
        <List.Item
          // The id must be explicit: onSelectionChange reports it, and it keys the PDF cache.
          id={itemId(document)}
          key={itemId(document)}
          icon={KIND_ICON[document.kind]}
          title={document.ref}
          subtitle={document.date ? formatShortDate(document.date, locale) : undefined}
          detail={<DocumentPanel document={document} locale={locale} />}
          // Raycast hides accessories while the detail pane is open, so they are dropped explicitly.
          accessories={
            showDetail
              ? undefined
              : [
                  { text: formatMoney(document.totalTtc, document.currency, locale) },
                  { tag: { value: document.status.label, color: TONE_COLOR[document.status.tone] } },
                ]
          }
          quickLook={pdfPaths[itemId(document)] ? { path: pdfPaths[itemId(document)], name: document.ref } : undefined}
          actions={
            <ActionPanel>
              <Action.Push
                title="Show Line Items"
                icon={Icon.List}
                target={<DocumentDetail kind={document.kind} id={document.id} documentRef={document.ref} />}
              />
              {pdfPaths[itemId(document)] ? (
                // Quick Look exists only on macOS; elsewhere the PDF opens in the default app.
                isMacOS() ? (
                  <Action.ToggleQuickLook title="Preview PDF" shortcut={QUICK_LOOK} />
                ) : (
                  <Action.Open title="Open PDF" target={pdfPaths[itemId(document)]} shortcut={QUICK_LOOK} />
                )
              ) : null}
              {toggleDetail}
              <Action.OpenInBrowser
                title="Open in Dolibarr"
                url={documentUrl(web, document.kind, document.id)}
                shortcut={OPEN_IN_BROWSER}
              />
              <Action.CopyToClipboard
                title="Copy Reference"
                content={document.ref}
                shortcut={Keyboard.Shortcut.Common.Copy}
              />
            </ActionPanel>
          }
        />
      ))}
    </List.Section>
  );
}
