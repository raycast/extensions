import type { Transaction } from "./types";

/** Select a counterparty logo from the newest enriched transaction in this payee group. */
export function merchantLogo(transactions: Transaction[]): string | undefined {
  // A generic bank payee can group several actual merchants. A single logo
  // would misrepresent that group, so keep the neutral icon in that case.
  const counterparties = new Set(
    transactions.map((transaction) => transaction.enriched?.counterparty?.name?.trim().toLowerCase()).filter(Boolean),
  );
  if (counterparties.size > 1) return undefined;
  const newestFirst = [...transactions].sort(
    (a, b) => (b.booking_date || "").localeCompare(a.booking_date || "") || b.id - a.id,
  );
  for (const transaction of newestFirst) {
    const source = transaction.enriched?.counterparty?.logo_url;
    if (!source) continue;
    try {
      const url = new URL(source);
      // Image sources can also be local paths. Only accept remote logo URLs.
      if (url.protocol === "https:" && !url.username && !url.password) return url.href;
    } catch {
      // Missing/malformed logos use the native merchant icon.
    }
  }
  // A payment intermediary is not necessarily the merchant, so don't use its logo.
  return undefined;
}
