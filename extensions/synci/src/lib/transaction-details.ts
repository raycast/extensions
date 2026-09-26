import { accountName, dateLabel, money, transactionDescription, transactionName } from "./format";
import type { Transaction } from "./types";

const mainFields = new Set([
  "id",
  "financial_account_id",
  "amount",
  "currency",
  "booked",
  "booking_date",
  "value_date",
  "mapped_fields",
]);

const relationships = new Set([
  "financial_account",
  "financial_connection",
  "institution",
  "transfer_logs",
  "transfer_links",
  "failed_transfers",
  "attempted_transfers",
]);

export function fieldLabel(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w+/g, (word) =>
      ["id", "iban", "bban", "bic", "pan", "url", "mcc", "msisdn"].includes(word.toLowerCase())
        ? word.toUpperCase()
        : word[0].toUpperCase() + word.slice(1),
    );
}

export function detailFields(value: unknown, path = "", includeEmpty = true): [string, string][] {
  if (!includeEmpty && (value === null || value === undefined || value === "")) return [];
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value);
    if (entries.length) {
      return entries.flatMap(([key, child]) =>
        detailFields(
          child,
          [path, Array.isArray(value) ? `Item ${Number(key) + 1}` : fieldLabel(key)].filter(Boolean).join(" › "),
          includeEmpty,
        ),
      );
    }
    return includeEmpty ? [[path, Array.isArray(value) ? "[]" : "{}"]] : [];
  }
  return [[path, value === null || value === undefined ? "Not reported" : value === "" ? '""' : String(value)]];
}

export function transactionMetadata(transaction: Transaction): [string, string][] {
  const main: [string, string][] = [
    ["Payee", transactionName(transaction)],
    ["Amount", money(transaction.amount, transaction.currency)],
    ["Currency", transaction.currency],
    ["Description", transactionDescription(transaction) || "Not reported"],
    ["Account", accountName(transaction.financial_account)],
    ["Institution", transaction.financial_account?.financial_connection?.institution?.name || "Not reported"],
    ["Status", transaction.booked ? "Booked" : "Pending"],
    ["Booking Date", dateLabel(transaction.booking_date)],
    ["Value Date", dateLabel(transaction.value_date)],
  ];
  if (transaction.mapped_fields?.date && transaction.mapped_fields.date !== transaction.booking_date) {
    main.push(["Synci Display Date", dateLabel(transaction.mapped_fields.date)]);
  }
  main.push(["Transaction ID", String(transaction.id)]);

  const advanced = Object.entries(transaction)
    .filter(([key]) => !mainFields.has(key) && !relationships.has(key))
    .flatMap(([key, value]) => detailFields(value, fieldLabel(key), false));

  return [...main, ...advanced];
}
