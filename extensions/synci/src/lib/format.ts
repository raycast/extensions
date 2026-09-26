import Decimal from "decimal.js";
import { APP_URL } from "./config";
import type { Amount, FinancialAccount, Transaction } from "./types";

export function decimal(value: Amount | null | undefined): Decimal | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  try {
    const result = new Decimal(value);
    return result.isFinite() ? result : undefined;
  } catch {
    return undefined;
  }
}

export function money(amount: Amount | null | undefined, currency?: string | null, locale?: string): string {
  const value = decimal(amount);
  if (!value) return "Unavailable";
  if (!currency) return `${value.toFixed(2)} (unknown currency)`;
  try {
    // Decimal arithmetic is preserved until the final presentation boundary.
    return new Intl.NumberFormat(locale, { style: "currency", currency, currencyDisplay: "narrowSymbol" }).format(
      value.toNumber(),
    );
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

export function accountName(account?: FinancialAccount | null): string {
  return (
    account?.custom_name ||
    account?.name ||
    account?.display_name ||
    account?.product_name ||
    (account?.currency ? `${account.currency} Account` : undefined) ||
    (account ? `Account ${account.id}` : "Unknown Account")
  );
}

export function transactionName(transaction: Transaction): string {
  return (
    transaction.mapped_fields?.payee ||
    (decimal(transaction.amount)?.isNegative() ? transaction.creditor?.name : transaction.debtor?.name) ||
    transactionDescription(transaction) ||
    "Transaction"
  );
}

export function transactionDescription(transaction: Transaction): string {
  return (
    transaction.mapped_fields?.description ||
    transaction.remittance_information?.unstructured ||
    transaction.remittance_information?.structured ||
    transaction.remittance_information?.unstructured_array?.join(" · ") ||
    transaction.additional_information ||
    ""
  );
}

export function dateOnly(value: Date): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

export function dateLabel(value?: string | null, includeTime = false): string {
  if (!value) return "Not reported";
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value);
  if (Number.isNaN(date.getTime())) return "Not reported";
  return includeTime
    ? date.toLocaleString()
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function markdown(value: string): string {
  return value.replace(/[\\`*_{}[\]()#+.!|<>~-]/g, "\\$&");
}

export function accountUrl(account: FinancialAccount): string {
  const category = account.financial_connection?.institution?.category?.toUpperCase();
  const section = category === "CRYPTO" ? "crypto" : category === "BROKERAGE" ? "brokerages" : "banks";
  return `${APP_URL}/${section}/accounts/${account.id}`;
}

export function accountBalance(account: FinancialAccount) {
  const amount = account.balance?.cleared ?? account.total_balance?.amount ?? account.balance?.available;
  const currency =
    account.balance?.cleared != null
      ? account.currency
      : account.total_balance?.amount != null
        ? (account.total_balance.currency ?? account.currency)
        : account.currency;
  const kind =
    account.balance?.cleared != null ? "Cleared" : account.total_balance?.amount != null ? "Total" : "Available";
  return { amount, currency, kind };
}
