import { Color } from "@raycast/api";
import type { Money, WalletRecord } from "./api";

export interface ParsedMoney {
  value: number;
  currency: string;
}

/** The API represents amounts either as plain numbers or as {amount|value, currencyCode|currency}. */
export function parseMoney(
  input: Money | number | string | undefined | null,
  fallbackCurrency = "",
): ParsedMoney | null {
  if (input === undefined || input === null) return null;
  if (typeof input === "number")
    return { value: input, currency: fallbackCurrency };
  if (typeof input === "string") {
    const num = Number(input);
    return Number.isFinite(num)
      ? { value: num, currency: fallbackCurrency }
      : null;
  }
  const raw = input.amount ?? input.value;
  const num = typeof raw === "string" ? Number(raw) : raw;
  if (typeof num !== "number" || !Number.isFinite(num)) return null;
  return {
    value: num,
    currency: input.currencyCode ?? input.currency ?? fallbackCurrency,
  };
}

export function recordMoney(record: WalletRecord): ParsedMoney | null {
  return parseMoney(record.amount) ?? parseMoney(record.convertedAmount);
}

/** Amount in a single reference currency when available (convertedAmount), else the native amount. */
export function recordConvertedMoney(record: WalletRecord): ParsedMoney | null {
  return parseMoney(record.convertedAmount) ?? parseMoney(record.amount);
}

/** The API may return positive amounts with the sign conveyed by recordType instead. */
function applyRecordSign(
  record: WalletRecord,
  money: ParsedMoney | null,
): ParsedMoney | null {
  if (!money) return null;
  if (record.recordType === "expense")
    return { ...money, value: -Math.abs(money.value) };
  if (record.recordType === "income")
    return { ...money, value: Math.abs(money.value) };
  return money;
}

export function recordSignedMoney(record: WalletRecord): ParsedMoney | null {
  return applyRecordSign(record, recordMoney(record));
}

export function recordSignedConvertedMoney(
  record: WalletRecord,
): ParsedMoney | null {
  return applyRecordSign(record, recordConvertedMoney(record));
}

/** Recursively looks for a monetary value inside nested API objects (balance, recordStats…). */
export function parseMoneyDeep(
  input: unknown,
  fallbackCurrency = "",
  depth = 3,
): ParsedMoney | null {
  const direct = parseMoney(input as Money | number, fallbackCurrency);
  if (direct) return direct;
  if (depth <= 0 || !input || typeof input !== "object") return null;
  const obj = input as Record<string, unknown>;
  const currency =
    (typeof obj.currencyCode === "string" && obj.currencyCode) ||
    (typeof obj.currency === "string" && obj.currency) ||
    fallbackCurrency;
  for (const key of [
    "currentBalance",
    "rawCurrentBalance",
    "current",
    "balance",
    "available",
    "amount",
    "value",
    "total",
  ]) {
    if (key in obj) {
      const found = parseMoneyDeep(obj[key], currency, depth - 1);
      if (found) return found;
    }
  }
  return null;
}

export function formatMoney(money: ParsedMoney | null): string {
  if (!money) return "—";
  if (!money.currency)
    return money.value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: money.currency,
    }).format(money.value);
  } catch {
    return `${money.value.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${money.currency}`;
  }
}

export function formatMoneyMap(byCurrency: Map<string, number>): string {
  if (byCurrency.size === 0) return "—";
  return [...byCurrency.entries()]
    .map(([currency, value]) => formatMoney({ value, currency }))
    .join("  ·  ");
}

export function amountColor(value: number): Color {
  return value < 0 ? Color.Red : Color.Green;
}

export function formatDate(iso: string | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function isTransfer(record: WalletRecord): boolean {
  // paymentType "transfer" is NOT reliable: bank-synced purchases come with
  // paymentType=transfer but recordType=expense. Only the transfer object
  // marks a real transfer between accounts.
  return record.transfer != null;
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function toDateParam(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
