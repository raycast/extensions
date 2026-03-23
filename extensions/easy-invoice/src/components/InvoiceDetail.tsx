import { Action, ActionPanel, Clipboard, Detail, Icon, open, showInFinder, showToast, Toast } from "@raycast/api";
import { formatCurrency, formatDate, buildInvoiceSummary } from "../lib/formatters";
import { STATUS_LABELS } from "../lib/constants";
import { Invoice } from "../lib/types";

interface InvoiceDetailProps {
  invoice: Invoice;
  onDuplicate?: () => void;
}

export default function InvoiceDetail({ invoice, onDuplicate }: InvoiceDetailProps) {
  const lineItemsTable = invoice.lineItems
    .map(
      (item) =>
        `| ${item.description} | ${Number.isInteger(item.quantity) ? item.quantity : item.quantity.toFixed(2)} | ${formatCurrency(item.rate)} | ${formatCurrency(item.lineTotal)} |`,
    )
    .join("\n");

  const md = `# ${invoice.invoiceNumber} - ${invoice.clientName}

**Status:** ${STATUS_LABELS[invoice.status]}
**Date:** ${formatDate(invoice.invoiceDate)}
**Due:** ${formatDate(invoice.dueDate)}

---

## Client
**${invoice.clientName}**
${invoice.clientAddress ? invoice.clientAddress + "\n" : ""}${invoice.clientEmail}

---

## Line Items

| Description | Qty | Rate | Amount |
|---|---|---|---|
${lineItemsTable}

---

**Subtotal:** ${formatCurrency(invoice.subtotal)}
${invoice.vatApplied ? `**VAT (${invoice.vatRate}%):** ${formatCurrency(invoice.vatAmount)}` : ""}
**Total:** ${formatCurrency(invoice.total)}

${invoice.notes ? `---\n\n## Notes\n${invoice.notes}` : ""}

---

*PDF:* \`${invoice.pdfPath}\`
`;

  return (
    <Detail
      markdown={md}
      navigationTitle={invoice.invoiceNumber}
      actions={
        <ActionPanel>
          <Action title="Open PDF" icon={Icon.Document} onAction={() => open(invoice.pdfPath)} />
          <Action
            title="Open in Finder"
            icon={Icon.Finder}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
            onAction={() => showInFinder(invoice.pdfPath)}
          />
          <Action
            title="Copy File Path"
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
            onAction={async () => {
              await Clipboard.copy(invoice.pdfPath);
              await showToast({
                style: Toast.Style.Success,
                title: "Path copied",
              });
            }}
          />
          <Action
            title="Copy Invoice Summary"
            icon={Icon.Text}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            onAction={async () => {
              await Clipboard.copy(buildInvoiceSummary(invoice));
              await showToast({
                style: Toast.Style.Success,
                title: "Summary copied",
              });
            }}
          />
          {onDuplicate && (
            <Action
              title="Duplicate Invoice"
              icon={Icon.CopyClipboard}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              onAction={onDuplicate}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
