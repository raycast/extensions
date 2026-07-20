/**
 * Invoices command for viewing bunq subscription invoices.
 */

import { Action, ActionPanel, List, Detail, Icon } from "@raycast/api";
import { useBunqSession, withSessionRefresh } from "./hooks/useBunqSession";
import { getInvoices, Invoice } from "./api/endpoints";
import { usePromise } from "@raycast/utils";
import { ErrorView } from "./components";
import { formatCurrency, formatDate } from "./lib/formatters";
import { getInvoiceStatusAppearance } from "./lib/status-helpers";
import { getErrorMessage } from "./lib/errors";
import { copyToClipboard } from "./lib/actions";
import { requireUserId } from "./lib/session-guard";

function InvoiceDetail({ invoice }: { invoice: Invoice }) {
  const statusAppearance = getInvoiceStatusAppearance(invoice.status as "OPEN" | "PAID" | "OVERDUE" | "VOIDED");
  const invoiceNumber = invoice.invoice_number != null ? String(invoice.invoice_number) : `#${invoice.id}`;

  const markdown = `# Invoice ${invoiceNumber}

**Status:** ${statusAppearance.label}

---

## Invoice Details

${invoice.description ? `**Description:** ${invoice.description}` : ""}

**Invoice Date:** ${invoice.invoice_date ? formatDate(invoice.invoice_date) : "N/A"}

**Due Date:** ${invoice.due_date ? formatDate(invoice.due_date) : "N/A"}

## Amount

**Total:** ${formatCurrency(invoice.total_vat_inclusive?.value || "0", invoice.total_vat_inclusive?.currency || "EUR")}

${invoice.total_vat_exclusive ? `**Excl. VAT:** ${formatCurrency(invoice.total_vat_exclusive.value, invoice.total_vat_exclusive.currency)}` : ""}

---

${invoice.category ? `**Category:** ${invoice.category}` : ""}
`;

  return (
    <Detail
      navigationTitle={`Invoice ${invoiceNumber}`}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Invoice Number" text={invoiceNumber} />
          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item text={statusAppearance.label} color={statusAppearance.color} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          {invoice.invoice_date && (
            <Detail.Metadata.Label title="Invoice Date" text={formatDate(invoice.invoice_date)} />
          )}
          {invoice.due_date && <Detail.Metadata.Label title="Due Date" text={formatDate(invoice.due_date)} />}
          <Detail.Metadata.Separator />
          {invoice.total_vat_inclusive && (
            <Detail.Metadata.Label
              title="Total Amount"
              text={formatCurrency(invoice.total_vat_inclusive.value, invoice.total_vat_inclusive.currency)}
            />
          )}
          {invoice.category && <Detail.Metadata.Label title="Category" text={invoice.category} />}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title="Open bunq" target="https://bunq.com/app" text="View in app" />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {invoice.pdf_attachment && invoice.pdf_attachment.uuid && (
            <Action.OpenInBrowser
              title="Download PDF"
              icon={Icon.Document}
              url={`https://api.bunq.com/v1/attachment-public/${invoice.pdf_attachment.uuid}/content`}
            />
          )}
          <Action
            title="Copy Invoice Number"
            icon={Icon.Clipboard}
            onAction={() => copyToClipboard(invoiceNumber, "invoice number")}
          />
          {invoice.total_vat_inclusive && (
            <Action
              title="Copy Amount"
              icon={Icon.Clipboard}
              onAction={() => copyToClipboard(invoice.total_vat_inclusive!.value, "amount")}
            />
          )}
          <Action.OpenInBrowser title="Open Bunq" url="https://bunq.com/app" />
        </ActionPanel>
      }
    />
  );
}

function InvoiceListItem({ invoice }: { invoice: Invoice }) {
  const statusAppearance = getInvoiceStatusAppearance(invoice.status as "OPEN" | "PAID" | "OVERDUE" | "VOIDED");
  const amount = invoice.total_vat_inclusive
    ? formatCurrency(invoice.total_vat_inclusive.value, invoice.total_vat_inclusive.currency)
    : "N/A";

  const title = invoice.invoice_number != null ? String(invoice.invoice_number) : `Invoice #${invoice.id}`;

  return (
    <List.Item
      title={title}
      subtitle={invoice.description || invoice.category || ""}
      accessories={[
        invoice.invoice_date ? { date: new Date(invoice.invoice_date), tooltip: "Invoice date" } : {},
        { text: amount, icon: Icon.Receipt, tooltip: "Total amount" },
        {
          icon: statusAppearance.icon,
          tag: { value: statusAppearance.label, color: statusAppearance.color },
          tooltip: "Status",
        },
      ].filter((a) => Object.keys(a).length > 0)}
      actions={
        <ActionPanel>
          <Action.Push title="View Invoice" icon={Icon.Eye} target={<InvoiceDetail invoice={invoice} />} />
          {invoice.pdf_attachment && invoice.pdf_attachment.uuid && (
            <Action.OpenInBrowser
              title="Download PDF"
              icon={Icon.Document}
              url={`https://api.bunq.com/v1/attachment-public/${invoice.pdf_attachment.uuid}/content`}
            />
          )}
          <Action
            title="Copy Invoice Number"
            icon={Icon.Clipboard}
            onAction={() => copyToClipboard(title, "invoice number")}
          />
          {invoice.total_vat_inclusive && (
            <Action
              title="Copy Amount"
              icon={Icon.Clipboard}
              onAction={() => copyToClipboard(invoice.total_vat_inclusive!.value, "amount")}
            />
          )}
        </ActionPanel>
      }
    />
  );
}

export default function InvoicesCommand() {
  const session = useBunqSession();

  const {
    data: invoices,
    isLoading,
    error,
    revalidate,
  } = usePromise(
    async () => {
      if (!session.userId || !session.sessionToken) return [];
      const userId = requireUserId(session);
      return withSessionRefresh(session, () => getInvoices(userId, session.getRequestOptions()));
    },
    [],
    { execute: session.isConfigured && !session.isLoading },
  );

  if (session.isLoading) {
    return <List isLoading />;
  }

  if (session.error || error) {
    return (
      <ErrorView
        title="Error Loading Invoices"
        message={getErrorMessage(session.error || error)}
        onRetry={revalidate}
        onRefreshSession={session.refresh}
      />
    );
  }

  // Group invoices by status
  const openInvoices = invoices?.filter((i) => i.status === "OPEN" || i.status === "OVERDUE") || [];
  const paidInvoices = invoices?.filter((i) => i.status === "PAID") || [];
  const otherInvoices =
    invoices?.filter((i) => i.status !== "OPEN" && i.status !== "OVERDUE" && i.status !== "PAID") || [];

  return (
    <List isLoading={isLoading}>
      {invoices?.length === 0 && (
        <List.EmptyView icon={Icon.Receipt} title="No Invoices" description="You don't have any invoices yet" />
      )}
      {openInvoices.length > 0 && (
        <List.Section title={`Open Invoices (${openInvoices.length})`}>
          {openInvoices.map((invoice) => (
            <InvoiceListItem key={invoice.id} invoice={invoice} />
          ))}
        </List.Section>
      )}
      {paidInvoices.length > 0 && (
        <List.Section title={`Paid Invoices (${paidInvoices.length})`}>
          {paidInvoices.map((invoice) => (
            <InvoiceListItem key={invoice.id} invoice={invoice} />
          ))}
        </List.Section>
      )}
      {otherInvoices.length > 0 && (
        <List.Section title="Other Invoices">
          {otherInvoices.map((invoice) => (
            <InvoiceListItem key={invoice.id} invoice={invoice} />
          ))}
        </List.Section>
      )}
    </List>
  );
}
