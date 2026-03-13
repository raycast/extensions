import { Color } from "@raycast/api";
import { Invoice, Contact, CompanyInfo, Project, Task, User } from "../types";

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

export function getProjectDisplayName(project: string | Project): string {
  if (typeof project === "string") {
    return formatUriAsName(project);
  }
  return project.name || "Unknown Project";
}

export function getTaskDisplayName(task: string | Task): string {
  if (typeof task === "string") {
    return formatUriAsName(task);
  }
  return task.name || "Unknown Task";
}

export function formatDateForAPI(date: Date): string {
  // Format date as YYYY-MM-DD in local timezone to avoid timezone conversion issues
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getUserDisplayName(user: string | User): string {
  if (typeof user === "string") {
    return formatUriAsName(user);
  }
  const firstName = user.first_name || "";
  const lastName = user.last_name || "";
  return [firstName, lastName].filter(Boolean).join(" ") || "Unknown User";
}
