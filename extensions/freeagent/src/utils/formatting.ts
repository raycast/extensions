import { Color } from "@raycast/api";
import { Invoice, Contact, CompanyInfo } from "../types";

export function parseDate(dateString: string): Date {
  return new Date(dateString);
}

export function mapStatusColor(status: string): Color {
  switch (status.toLowerCase()) {
    case "overdue":
      return Color.Red;
    case "draft":
      return Color.Yellow;
    case "paid":
      return Color.Green;
    case "scheduled to email":
      return Color.Blue;
    case "partially paid":
      return Color.Orange;
    default:
      return Color.SecondaryText;
  }
}

export function getInvoiceUrl(invoice: Invoice, companyInfo: CompanyInfo): string {
  const id = invoice.url.split("/").pop();
  return `https://${companyInfo.subdomain}.FreeAgent.com/invoices/${id}`;
}

export function getContactUrl(contactUrl: string, companyInfo: CompanyInfo): string {
  const id = contactUrl.split("/").pop();
  return `https://${companyInfo.subdomain}.FreeAgent.com/contacts/${id}`;
}

export function getBankTransactionUrl(
  transactionUrl: string,
  bankAccountUrl: string,
  companyInfo: CompanyInfo,
): string {
  const transactionId = transactionUrl.split("/").pop() || "";
  const accountId = bankAccountUrl.split("/").pop() || "";
  // The format should be: https://:subdomain.FreeAgent.com/bank_accounts/:account_id/bank_account_entries/:entry_id/edit?bank_transaction_id=:id
  // However, we need to construct the entry_id. For now, we'll use the transaction_id as both entry_id and bank_transaction_id
  return `https://${companyInfo.subdomain}.FreeAgent.com/bank_accounts/${accountId}/bank_account_entries/${transactionId}/edit?bank_transaction_id=${transactionId}`;
}

export function getContactDisplayName(contact: Contact): string {
  if (contact.organisation_name) {
    return contact.organisation_name;
  }
  const firstName = contact.first_name || "";
  const lastName = contact.last_name || "";
  return `${firstName} ${lastName}`.trim() || "Unknown Contact";
}

export function extractIdFromUrl(url: string): string {
  return url.split("/").pop() || "";
}

export function formatUriAsName(uri: string): string {
  const id = extractIdFromUrl(uri);
  const resourceType = uri.split("/").slice(-2, -1)[0] || "resource";
  return `${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)} ${id}`;
}

export function formatCurrencyAmount(currency: string, amount: number | string): string {
  const formatter = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
  });
  return formatter.format(Number(amount));
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-GB");
}
