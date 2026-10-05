import type { Transaction } from "./types";

export function transactionCategory(transaction: Transaction): string | undefined {
  const category = transaction.enriched?.category_general;
  return typeof category === "string" ? category.trim() || undefined : undefined;
}

export function categoryMatches(transaction: Transaction, category?: string): boolean {
  return (
    category === undefined || (transactionCategory(transaction) ?? "").toLowerCase() === category.trim().toLowerCase()
  );
}

export function categoryOptions(transactions: Transaction[]): string[] {
  const categories = new Map<string, string>();
  for (const transaction of transactions) {
    const name = transactionCategory(transaction);
    if (name) categories.set(name.toLowerCase(), name);
  }
  return [...categories.values()].sort((a, b) => a.localeCompare(b));
}
