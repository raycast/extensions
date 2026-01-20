import React, { useState, useEffect } from "react";
import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  LocalStorage,
  Keyboard,
} from "@raycast/api";
import { useCustomers } from "./hooks/useCustomers";
import { useInvoices } from "./hooks/useInvoices";
import { useCreditNotes } from "./hooks/useCreditNotes";
import {
  detectSearchType,
  formatCurrency,
  formatDate,
  getSubscriptionStatusColor,
  getInvoiceStatusColor,
  getCreditNoteStatusColor,
} from "./utils/detectSearchType";
import {
  CustomerWithMeta,
  InvoiceWithMeta,
  CreditNoteWithMeta,
  SearchType,
} from "./types/chargebee";

// History item type
interface HistoryItem {
  type: "customer" | "invoice" | "credit_note";
  id: string;
  title: string;
  subtitle?: string;
  url: string;
  site: string;
  siteId: string;
  timestamp: number;
}

const HISTORY_KEY = "chargebee-search-history";
const MAX_HISTORY = 10;

async function addToHistory(item: Omit<HistoryItem, "timestamp">) {
  const history = await getHistory();
  const newItem: HistoryItem = { ...item, timestamp: Date.now() };

  // Remove duplicates and add new item at the start
  const filtered = history.filter((h) => !(h.type === item.type && h.id === item.id));
  const updated = [newItem, ...filtered].slice(0, MAX_HISTORY);

  await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
}

async function getHistory(): Promise<HistoryItem[]> {
  const stored = await LocalStorage.getItem<string>(HISTORY_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

function useHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getHistory().then((h) => {
      setHistory(h);
      setIsLoading(false);
    });
  }, []);

  const refresh = async () => {
    const h = await getHistory();
    setHistory(h);
  };

  return { history, isLoading, refresh };
}

const SITE_COLORS = [Color.Blue, Color.Purple, Color.Orange, Color.Green];
const siteColorMap = new Map<string, Color>();

function getSiteBadgeColor(site: string): Color {
  if (!siteColorMap.has(site)) {
    siteColorMap.set(site, SITE_COLORS[siteColorMap.size % SITE_COLORS.length]);
  }
  return siteColorMap.get(site) || Color.Blue;
}

function CustomerListItem({ customer, onOpen }: { customer: CustomerWithMeta; onOpen?: () => void }) {
  const customerUrl = `https://${customer.siteId}.chargebee.com/admin-console/customers/${customer.id}`;
  const subscriptionUrl = customer.subscription
    ? `https://${customer.siteId}.chargebee.com/admin-console/subscriptions/${customer.subscription.id}`
    : undefined;
  const lastInvoiceUrl = customer.lastInvoiceId
    ? `https://${customer.siteId}.chargebee.com/admin-console/invoices/${customer.lastInvoiceId}`
    : undefined;
  const status = customer.subscription?.status || "No subscription";
  const renewalDate = customer.subscription?.current_term_end
    ? formatDate(customer.subscription.current_term_end)
    : "N/A";
  const title = customer.company || `${customer.first_name || ""} ${customer.last_name || ""}`.trim() || customer.id;

  const handleOpen = async () => {
    await addToHistory({
      type: "customer",
      id: customer.id,
      title,
      url: customerUrl,
      site: customer.site,
      siteId: customer.siteId,
    });
    onOpen?.();
  };

  return (
    <List.Item
      title={title}
      accessories={[
        {
          text: `Renews: ${renewalDate}`,
        },
        {
          tag: {
            value: customer.site,
            color: getSiteBadgeColor(customer.site),
          },
        },
        {
          tag: {
            value: status.replace("_", " "),
            color: getSubscriptionStatusColor(status),
          },
        },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open Customer" url={customerUrl} onOpen={handleOpen} />
            {subscriptionUrl && (
              <Action.OpenInBrowser title="Open Subscription" url={subscriptionUrl} icon={Icon.Calendar} />
            )}
            {lastInvoiceUrl && (
              <Action.OpenInBrowser title="Open Last Invoice" url={lastInvoiceUrl} icon={Icon.Document} />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy Customer ID" content={customer.id} />
            {customer.email && (
              <Action.CopyToClipboard title="Copy Email" content={customer.email} />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function InvoiceListItem({ invoice, onOpen }: { invoice: InvoiceWithMeta; onOpen?: () => void }) {
  const invoiceUrl = `https://${invoice.siteId}.chargebee.com/admin-console/invoices/${invoice.id}`;
  const invoicePdfUrl = `https://${invoice.siteId}.chargebee.com/admin-console/invoices/${invoice.id}/pdf`;
  const customerUrl = `https://${invoice.siteId}.chargebee.com/admin-console/customers/${invoice.customer_id}`;
  const title = `#${invoice.id}`;

  const handleOpen = async () => {
    await addToHistory({
      type: "invoice",
      id: invoice.id,
      title,
      subtitle: invoice.customerName,
      url: invoiceUrl,
      site: invoice.site,
      siteId: invoice.siteId,
    });
    onOpen?.();
  };

  return (
    <List.Item
      title={title}
      subtitle={invoice.customerName}
      accessories={[
        {
          text: formatCurrency(invoice.total, invoice.currency_code),
        },
        {
          text: formatDate(invoice.date),
        },
        {
          tag: {
            value: invoice.site,
            color: getSiteBadgeColor(invoice.site),
          },
        },
        {
          tag: {
            value: invoice.status.replace("_", " "),
            color: getInvoiceStatusColor(invoice.status),
          },
        },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open Invoice" url={invoiceUrl} onOpen={handleOpen} />
            <Action.OpenInBrowser title="Open Customer" url={customerUrl} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="View PDF" url={invoicePdfUrl} icon={Icon.Document} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy Invoice Number" content={invoice.id} />
            <Action.CopyToClipboard title="Copy Customer ID" content={invoice.customer_id} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function CreditNoteListItem({ creditNote, onOpen }: { creditNote: CreditNoteWithMeta; onOpen?: () => void }) {
  const creditNoteUrl = `https://${creditNote.siteId}.chargebee.com/admin-console/credit_notes/${creditNote.id}`;

  const handleOpen = async () => {
    await addToHistory({
      type: "credit_note",
      id: creditNote.id,
      title: creditNote.id,
      subtitle: creditNote.customerName,
      url: creditNoteUrl,
      site: creditNote.site,
      siteId: creditNote.siteId,
    });
    onOpen?.();
  };

  return (
    <List.Item
      title={creditNote.id}
      subtitle={creditNote.customerName}
      accessories={[
        {
          text: formatCurrency(creditNote.total, creditNote.currency_code),
        },
        {
          text: formatDate(creditNote.date),
        },
        {
          tag: {
            value: creditNote.site,
            color: getSiteBadgeColor(creditNote.site),
          },
        },
        {
          tag: {
            value: creditNote.status.replace("_", " "),
            color: getCreditNoteStatusColor(creditNote.status),
          },
        },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open Credit Note" url={creditNoteUrl} onOpen={handleOpen} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Credit Note ID"
              content={creditNote.id}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy Customer ID"
              content={creditNote.customer_id}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function HistoryListItem({ item, onOpen }: { item: HistoryItem; onOpen?: () => void }) {
  const typeIcon = item.type === "customer" ? Icon.Person : item.type === "invoice" ? Icon.Document : Icon.Receipt;
  const typeLabel = item.type === "customer" ? "Customer" : item.type === "invoice" ? "Invoice" : "Credit Note";

  const handleOpen = async () => {
    await addToHistory({
      type: item.type,
      id: item.id,
      title: item.title,
      subtitle: item.subtitle,
      url: item.url,
      site: item.site,
      siteId: item.siteId,
    });
    onOpen?.();
  };

  return (
    <List.Item
      icon={typeIcon}
      title={item.title}
      subtitle={item.subtitle}
      accessories={[
        { text: typeLabel },
        {
          tag: {
            value: item.site,
            color: getSiteBadgeColor(item.site),
          },
        },
      ]}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in Chargebee" url={item.url} onOpen={handleOpen} />
        </ActionPanel>
      }
    />
  );
}

function getSearchPlaceholder(searchType: SearchType): string {
  switch (searchType) {
    case "customer":
      return "Search customers by company name...";
    case "invoice":
      return "Search invoices by number...";
    case "credit_note":
      return "Search credit notes by ID...";
  }
}

function getEmptyViewTitle(searchType: SearchType, search: string): string {
  if (!search) {
    return "Start typing to search";
  }
  switch (searchType) {
    case "customer":
      return search.length < 2 ? "Type at least 2 characters" : "No customers found";
    case "invoice":
      return "No invoices found";
    case "credit_note":
      return "No credit notes found";
  }
}

function getEmptyViewDescription(searchType: SearchType): string {
  switch (searchType) {
    case "customer":
      return "Search by company name";
    case "invoice":
      return "Enter an invoice number (e.g., 1407419)";
    case "credit_note":
      return "Enter a credit note ID (e.g., CN-143 or TEST-CN-47)";
  }
}

export default function Command() {
  const [search, setSearch] = useState("");
  const searchType = detectSearchType(search);
  const { history, isLoading: isLoadingHistory, refresh: refreshHistory } = useHistory();

  const { customers, isLoading: isLoadingCustomers } = useCustomers(
    searchType === "customer" ? search : ""
  );
  const { invoices, isLoading: isLoadingInvoices } = useInvoices(
    searchType === "invoice" ? search : ""
  );
  const { creditNotes, isLoading: isLoadingCreditNotes } = useCreditNotes(
    searchType === "credit_note" ? search : ""
  );

  const isLoading = isLoadingHistory || isLoadingCustomers || isLoadingInvoices || isLoadingCreditNotes;
  const showHistory = !search && history.length > 0;

  return (
    <List
      isLoading={isLoading}
      searchText={search}
      onSearchTextChange={setSearch}
      searchBarPlaceholder="Search customers, invoices, or credit notes..."
      throttle
    >
      {!search && history.length === 0 && (
        <List.EmptyView
          title="Start typing to search"
          description="Search by company name, invoice number, or credit note ID"
          icon={Icon.MagnifyingGlass}
        />
      )}

      {showHistory && (
        <List.Section title="Recent">
          {history.map((item) => (
            <HistoryListItem key={`${item.type}-${item.id}`} item={item} onOpen={refreshHistory} />
          ))}
        </List.Section>
      )}

      {search && searchType === "customer" && customers.length === 0 && !isLoadingCustomers && (
        <List.EmptyView
          title={getEmptyViewTitle(searchType, search)}
          description={getEmptyViewDescription(searchType)}
          icon={Icon.MagnifyingGlass}
        />
      )}

      {search && searchType === "invoice" && invoices.length === 0 && !isLoadingInvoices && (
        <List.EmptyView
          title={getEmptyViewTitle(searchType, search)}
          description={getEmptyViewDescription(searchType)}
          icon={Icon.MagnifyingGlass}
        />
      )}

      {search && searchType === "credit_note" && creditNotes.length === 0 && !isLoadingCreditNotes && (
        <List.EmptyView
          title={getEmptyViewTitle(searchType, search)}
          description={getEmptyViewDescription(searchType)}
          icon={Icon.MagnifyingGlass}
        />
      )}

      {searchType === "customer" &&
        customers.map((customer) => (
          <CustomerListItem key={`${customer.site}-${customer.id}`} customer={customer} onOpen={refreshHistory} />
        ))}

      {searchType === "invoice" &&
        invoices.map((invoice) => (
          <InvoiceListItem key={`${invoice.site}-${invoice.id}`} invoice={invoice} onOpen={refreshHistory} />
        ))}

      {searchType === "credit_note" &&
        creditNotes.map((creditNote) => (
          <CreditNoteListItem key={`${creditNote.site}-${creditNote.id}`} creditNote={creditNote} onOpen={refreshHistory} />
        ))}
    </List>
  );
}
