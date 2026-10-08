import { toMajor } from "./money";
import { PROVIDER_LABELS, Sale } from "../providers/types";

export const CSV_HEADERS = [
  "date",
  "provider",
  "id",
  "status",
  "currency",
  "gross",
  "refunded",
  "fee",
  "net",
  "fee_net_currency",
  "customer_email",
  "customer_name",
  "product",
  "subscription_payment",
  "url",
] as const;

/**
 * RFC 4180 quoting, plus a guard against spreadsheet formula injection: cells that start with = + - @ or a control
 * character are prefixed with an apostrophe, because customer names and product names are user-controlled.
 */
export function csvCell(value: string | number | boolean | undefined): string {
  if (value === undefined) return "";
  let text = String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) {
    text = `'${text}`;
  }
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function amount(money: Sale["gross"] | undefined): string | undefined {
  return money ? String(toMajor(money)) : undefined;
}

export function salesToCsv(sales: Sale[]): string {
  const lines = [CSV_HEADERS.join(",")];
  for (const sale of sales) {
    const currency = sale.gross.currency;
    lines.push(
      [
        sale.createdAt.toISOString(),
        PROVIDER_LABELS[sale.provider],
        sale.id,
        sale.status,
        currency,
        String(toMajor(sale.gross)),
        amount(sale.refunded),
        // Fees and net can settle in a different currency than the sale (Stripe balance transactions).
        amount(sale.fee),
        amount(sale.net),
        (sale.net ?? sale.fee)?.currency,
        sale.customerEmail,
        sale.customerName,
        sale.productName,
        sale.isSubscriptionPayment,
        sale.url,
      ]
        .map(csvCell)
        .join(","),
    );
  }
  // Trailing newline so the file concatenates cleanly.
  return `${lines.join("\r\n")}\r\n`;
}

/** revenue-bar-sales-last-7-days-2026-10-08.csv, with -2, -3… appended when the name is taken. */
export function exportFileName(rangeLabel: string, now: Date, exists: (name: string) => boolean = () => false): string {
  const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const slug = rangeLabel
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const base = `revenue-bar-sales-${slug}-${day}`;
  let name = `${base}.csv`;
  for (let i = 2; exists(name); i++) {
    name = `${base}-${i}.csv`;
  }
  return name;
}
