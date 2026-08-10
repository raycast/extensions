import { getPreferenceValues } from "@raycast/api";
import { homedir } from "os";
import path from "path";
import { Invoice } from "./types";

export function formatCurrency(amount: number): string {
  const preferences = getPreferenceValues<Preferences>();
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: preferences.currencyCode || "GBP",
  }).format(amount);
}

export function getCurrencySymbol(): string {
  const preferences = getPreferenceValues<Preferences>();
  const currency = preferences.currencyCode || "GBP";
  return (
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    })
      .formatToParts(0)
      .find((p) => p.type === "currency")?.value ?? currency
  );
}

export function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatInvoiceNumber(prefix: string, num: number): string {
  return `${prefix}-${String(num).padStart(4, "0")}`;
}

export function parseAddress(address: string): string[] {
  return address
    .split(",")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function resolveSaveLocation(saveLocation: string): string {
  if (saveLocation.startsWith("~")) {
    return path.join(homedir(), saveLocation.slice(1));
  }
  return saveLocation;
}

export function isOverdue(invoice: Invoice): boolean {
  if (invoice.status === "paid") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(invoice.dueDate);
  due.setHours(0, 0, 0, 0);
  return due < today;
}

export function buildInvoiceSummary(invoice: Invoice): string {
  const lines = [
    `Invoice: ${invoice.invoiceNumber}`,
    `Client: ${invoice.clientName}`,
    `Date: ${formatDate(invoice.invoiceDate)}`,
    `Due: ${formatDate(invoice.dueDate)}`,
    "",
    ...invoice.lineItems.map(
      (item) =>
        `${item.description} - ${item.quantity} x ${formatCurrency(item.rate)} = ${formatCurrency(item.lineTotal)}`,
    ),
    "",
    `Subtotal: ${formatCurrency(invoice.subtotal)}`,
  ];

  if (invoice.vatApplied) {
    lines.push(`VAT (${invoice.vatRate}%): ${formatCurrency(invoice.vatAmount)}`);
  }

  lines.push(`Total: ${formatCurrency(invoice.total)}`);
  lines.push(`Status: ${invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}`);

  return lines.join("\n");
}
