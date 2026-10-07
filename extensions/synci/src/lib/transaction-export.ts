import { accountName, decimal, transactionDate, transactionDescription, transactionName } from "./format";
import type { Transaction } from "./types";

const HEADERS = ["Date", "Payee", "Description", "Amount", "Currency", "Status", "Account", "Transaction ID"];

function safeText(value: string): string {
  // Spreadsheet importers may evaluate text beginning with a formula prefix,
  // including prefixes hidden behind whitespace. Amounts are handled separately.
  return /^[\s\uFEFF]*[=+@-]|^[\t\r\n]/u.test(value) ? `'${value}` : value;
}

export function exportTransactions(transactions: Transaction[], format: "csv" | "tsv"): string {
  const rows = transactions.map((transaction) => [
    safeText(transactionDate(transaction) || ""),
    safeText(transactionName(transaction)),
    safeText(transactionDescription(transaction)),
    decimal(transaction.amount)?.toFixed() ?? "",
    safeText(transaction.currency),
    transaction.booked ? "Booked" : "Pending",
    safeText(accountName(transaction.financial_account)),
    String(transaction.id),
  ]);
  const encode = (value: string) =>
    format === "tsv"
      ? value.replace(/[\t\r\n]+/g, " ")
      : /[",\r\n]/.test(value)
        ? `"${value.replace(/"/g, '""')}"`
        : value;
  return [HEADERS, ...rows].map((row) => row.map(encode).join(format === "csv" ? "," : "\t")).join("\r\n") + "\r\n";
}
