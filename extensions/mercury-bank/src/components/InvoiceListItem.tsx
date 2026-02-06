import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import type { Invoice } from "../lib/types";
import { formatCurrency, formatDate, getInvoiceStatusIcon } from "../lib/utils";
import { INVOICE_STATUS_LABELS } from "../lib/constants";
import { AccountSwitcherActions } from "./AccountSwitcher";

interface InvoiceListItemProps {
  invoice: Invoice;
  showDetail?: boolean;
  toggleDetail?: () => void;
}

function InvoiceDetail({ invoice }: { invoice: Invoice }) {
  const statusIcon = getInvoiceStatusIcon(invoice.status);
  const statusLabel = INVOICE_STATUS_LABELS[invoice.status] ?? invoice.status;

  const paymentMethods: string[] = [];
  if (invoice.creditCardEnabled) paymentMethods.push("Credit Card");
  if (invoice.achDebitEnabled) paymentMethods.push("ACH");

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Amount"
            text={formatCurrency(invoice.amount)}
          />
          <List.Item.Detail.Metadata.TagList title="Status">
            <List.Item.Detail.Metadata.TagList.Item
              text={statusLabel}
              color={statusIcon.tintColor}
            />
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.Label
            title="Due Date"
            text={formatDate(invoice.dueDate)}
          />
          <List.Item.Detail.Metadata.Label
            title="Invoice Date"
            text={formatDate(invoice.invoiceDate)}
          />
          {invoice.lineItems.length > 0 && (
            <>
              <List.Item.Detail.Metadata.Separator />
              {invoice.lineItems.map((item, i) => (
                <List.Item.Detail.Metadata.Label
                  key={i}
                  title={item.name}
                  text={`${item.quantity} × ${formatCurrency(item.unitPrice)}`}
                />
              ))}
            </>
          )}
          <List.Item.Detail.Metadata.Separator />
          {paymentMethods.length > 0 && (
            <List.Item.Detail.Metadata.TagList title="Payment Methods">
              {paymentMethods.map((method) => (
                <List.Item.Detail.Metadata.TagList.Item
                  key={method}
                  text={method}
                  color={Color.Blue}
                />
              ))}
            </List.Item.Detail.Metadata.TagList>
          )}
          {invoice.payerMemo && (
            <List.Item.Detail.Metadata.Label
              title="Memo"
              text={invoice.payerMemo}
            />
          )}
          {invoice.internalNote && (
            <List.Item.Detail.Metadata.Label
              title="Internal Note"
              text={invoice.internalNote}
            />
          )}
          {invoice.poNumber && (
            <List.Item.Detail.Metadata.Label
              title="PO Number"
              text={invoice.poNumber}
            />
          )}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Link
            title="Invoice"
            target={`https://app.mercury.com/invoices/${invoice.slug}`}
            text="Open in Mercury"
          />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

export function InvoiceListItem({
  invoice,
  showDetail = false,
  toggleDetail,
}: InvoiceListItemProps) {
  const statusIcon = getInvoiceStatusIcon(invoice.status);
  const statusLabel = INVOICE_STATUS_LABELS[invoice.status] ?? invoice.status;

  const accessories: List.Item.Accessory[] = showDetail
    ? [{ text: formatCurrency(invoice.amount) }]
    : [
        { tag: { value: statusLabel, color: statusIcon.tintColor } },
        { text: `Due: ${formatDate(invoice.dueDate)}` },
        { text: formatCurrency(invoice.amount) },
      ];

  return (
    <List.Item
      title={`#${invoice.invoiceNumber}`}
      subtitle={invoice.payerMemo ?? undefined}
      icon={statusIcon}
      accessories={accessories}
      detail={showDetail ? <InvoiceDetail invoice={invoice} /> : undefined}
      keywords={[invoice.invoiceNumber, invoice.status]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser
              title="Open in Mercury"
              url={`https://app.mercury.com/invoices/${invoice.slug}`}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
            <Action.CopyToClipboard
              title="Copy Invoice Link"
              content={`https://app.mercury.com/invoices/${invoice.slug}`}
              shortcut={{ modifiers: ["cmd"], key: "l" }}
            />
            <Action.CopyToClipboard
              title="Copy Invoice Number"
              content={invoice.invoiceNumber}
            />
            <Action.CopyToClipboard
              title="Copy Amount"
              content={formatCurrency(invoice.amount)}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            {toggleDetail && (
              <Action
                title={showDetail ? "Hide Details" : "Show Details"}
                icon={Icon.Sidebar}
                shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                onAction={toggleDetail}
              />
            )}
            <Action.CopyToClipboard
              title="Copy Invoice Id"
              content={invoice.id}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <AccountSwitcherActions />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}