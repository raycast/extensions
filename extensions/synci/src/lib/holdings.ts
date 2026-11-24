import Decimal from "decimal.js";
import { accountName, accountSection, dateLabel, decimal, money } from "./format";
import type { AccountHolding, Amount, FinancialAccount } from "./types";

export function supportsHoldings(account: FinancialAccount): boolean {
  return accountSection(account) !== "banks";
}

export function holdingName(holding: AccountHolding): string {
  return holding.symbol || holding.description || `Holding ${holding.id}`;
}

export function assetClass(value?: string | null): string {
  const labels: Record<string, string> = {
    STOCK: "Stock",
    ETF: "ETF",
    OPTION: "Option",
    CRYPTOCURRENCY: "Cryptocurrency",
    FIXED_INCOME: "Fixed Income",
    MUTUAL_FUND: "Mutual Fund",
    OTHER: "Other",
  };
  return value ? labels[value] || value : "Not reported";
}

export function quantity(value: Amount | null | undefined): string {
  // Keep fractional crypto quantities exact, including values below 0.000001.
  return decimal(value)?.toFixed() ?? "Unavailable";
}

export function holdingPrice(value: Amount | null | undefined, currency?: string | null): string {
  const amount = decimal(value);
  if (!amount) return "Unavailable";
  if (!currency) return `${amount.toFixed()} (unknown currency)`;
  try {
    const options = { style: "currency" as const, currency, currencyDisplay: "narrowSymbol" as const };
    const digits = new Intl.NumberFormat(undefined, options).resolvedOptions().maximumFractionDigits ?? 2;
    return new Intl.NumberFormat(undefined, {
      ...options,
      maximumFractionDigits: Math.max(digits, Math.min(8, amount.decimalPlaces())),
    }).format(amount.toNumber());
  } catch {
    return `${amount.toFixed()} ${currency}`;
  }
}

export function uniqueHoldings(holdings: AccountHolding[]): AccountHolding[] {
  return [...new Map(holdings.map((holding) => [`${holding.financial_account_id}:${holding.id}`, holding])).values()];
}

export function holdingsTotals(holdings: AccountHolding[]) {
  const totals = new Map<string, { amount: Decimal; count: number }>();
  let unavailable = 0;
  for (const holding of uniqueHoldings(holdings)) {
    const amount = decimal(holding.market_value);
    if (!amount || !holding.currency) {
      unavailable++;
      continue;
    }
    const total = totals.get(holding.currency) ?? { amount: new Decimal(0), count: 0 };
    total.amount = total.amount.plus(amount);
    total.count++;
    totals.set(holding.currency, total);
  }
  return { totals: [...totals.entries()].sort(([a], [b]) => a.localeCompare(b)), unavailable };
}

export function holdingFields(holding: AccountHolding, account: FinancialAccount): [string, string][] {
  return [
    ["Symbol", holding.symbol || "Not reported"],
    ["Description", holding.description || "Not reported"],
    ["Market Value", money(holding.market_value, holding.currency)],
    ["Quantity", quantity(holding.quantity)],
    ["Last Price", holdingPrice(holding.last_price, holding.currency)],
    ["Average Purchase Price", holdingPrice(holding.average_purchase_price, holding.currency)],
    ["Currency", holding.currency || "Not reported"],
    ["Asset Class", assetClass(holding.asset_class)],
    ["Account", accountName(account)],
    ["Institution", account.financial_connection?.institution?.name || "Not reported"],
    ["Last Synced", dateLabel(holding.synced_at, true)],
    ["Account Sync", account.enabled ? "Enabled" : "Disabled"],
    ["Provider", holding.integrator || "Not reported"],
    ["Holding ID", String(holding.id)],
  ];
}
