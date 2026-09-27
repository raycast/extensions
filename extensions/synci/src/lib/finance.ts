import Decimal from "decimal.js";
import { accountBalance, dateOnly, decimal, transactionName } from "./format";
import type { FinancialAccount, FinancialConnection, Period, Transaction } from "./types";

export const PERIODS: { value: Period; title: string }[] = [
  { value: "7", title: "Last 7 Days" },
  { value: "30", title: "Last 30 Days" },
  { value: "month", title: "This Month" },
  { value: "all", title: "All Time" },
];

export function dateRange(period: Period, now = new Date()) {
  if (period === "all") return {};
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === "month") start.setDate(1);
  else start.setDate(start.getDate() - Number(period) + 1);
  return { after: dateOnly(start), before: dateOnly(now) };
}

export function balanceTotals(accounts: FinancialAccount[]) {
  const totals = new Map<string, { amount: Decimal; count: number; kinds: Set<string> }>();
  let unavailable = 0;
  for (const account of accounts) {
    const balance = accountBalance(account);
    const amount = decimal(balance.amount);
    if (!amount || !balance.currency) {
      unavailable++;
      continue;
    }
    const entry = totals.get(balance.currency) ?? { amount: new Decimal(0), count: 0, kinds: new Set<string>() };
    entry.amount = entry.amount.plus(amount);
    entry.count++;
    entry.kinds.add(balance.kind);
    totals.set(balance.currency, entry);
  }
  return { totals: [...totals.entries()].sort(([a], [b]) => a.localeCompare(b)), unavailable };
}

export function spendingSummary(transactions: Transaction[]) {
  const currencies = new Map<
    string,
    {
      amount: Decimal;
      count: number;
      merchants: Map<string, { amount: Decimal; count: number; transactions: Transaction[] }>;
    }
  >();
  let invalid = 0;
  const seen = new Set<number>();
  for (const transaction of transactions) {
    if (seen.has(transaction.id)) continue;
    seen.add(transaction.id);
    if (!transaction.booked) continue;
    const amount = decimal(transaction.amount);
    if (!amount || !transaction.currency) {
      invalid++;
      continue;
    }
    if (!amount.isNegative()) continue;
    const entry = currencies.get(transaction.currency) ?? { amount: new Decimal(0), count: 0, merchants: new Map() };
    const merchantName = transactionName(transaction);
    const merchant = entry.merchants.get(merchantName) ?? { amount: new Decimal(0), count: 0, transactions: [] };
    const outflow = amount.abs();
    entry.amount = entry.amount.plus(outflow);
    entry.count++;
    merchant.amount = merchant.amount.plus(outflow);
    merchant.count++;
    merchant.transactions.push(transaction);
    entry.merchants.set(merchantName, merchant);
    currencies.set(transaction.currency, entry);
  }
  return { currencies: [...currencies.entries()].sort(([a], [b]) => a.localeCompare(b)), invalid };
}

export function connectionState(
  connection: FinancialConnection,
  now = new Date(),
): { label: string; severity: number; message: string } {
  if (!connection.enabled) return { label: "Disabled", severity: 2, message: "This connection is disabled in Synci." };
  const expiry = connection.consent_expires_at ? new Date(connection.consent_expires_at) : undefined;
  if (expiry && expiry.getTime() <= now.getTime())
    return { label: "Consent Expired", severity: 3, message: "Open Synci to renew this connection's consent." };
  if (connection.health?.status === "DEAD")
    return {
      label: "Action Required",
      severity: 3,
      message: connection.health.integrator_message || "This connection needs your attention in Synci.",
    };
  if (connection.health?.status === "FAILING")
    return {
      label: "Sync Issues",
      severity: 2,
      message: connection.health.integrator_message || "Synci is having trouble syncing this connection.",
    };
  if (connection.status && connection.status !== "CONNECTED")
    return {
      label: connection.status.toLowerCase().replace(/_/g, " "),
      severity: 2,
      message: connection.status_message || "Open Synci to check this connection.",
    };
  if (expiry && expiry.getTime() - now.getTime() <= 7 * 86_400_000)
    return { label: "Consent Expiring", severity: 1, message: "Consent expires within the next seven days." };
  if (connection.health?.status === "HEALTHY")
    return {
      label: "Healthy",
      severity: 0,
      message: connection.health.transient_message || "Synci reports this connection as healthy.",
    };
  return { label: "Unknown", severity: 1, message: "No connection health has been reported yet." };
}
