import type { Enhet } from "../types";

export function formatAddress(addr?: Enhet["forretningsadresse"]): string {
  if (!addr) {
    return "";
  }
  const street = addr.adresse?.join(", ") ?? "";
  const post = [addr.postnummer, addr.poststed].filter(Boolean).join(" ");
  const country = addr.land ?? "Norge";

  return [street, post, country].filter(Boolean).join(", ");
}

/**
 * Parse a Norwegian-formatted numeric string (including parenthesised negatives,
 * non-breaking spaces, and comma/period separators) to a number.
 */
export function toNumber(raw: string): number | undefined {
  if (!raw) return undefined;
  let text = String(raw).trim();
  const wasParenNegative = /^\(.*\)$/.test(text);
  if (wasParenNegative) text = text.slice(1, -1);
  text = text.replace(/[\s\u00A0]/g, "");
  text = text.replace(/[^0-9,.-]/g, "");
  if (text.includes(",") && text.includes(".")) text = text.replace(/\./g, "");
  text = text.replace(/,/g, ".");
  const num = parseFloat(text);
  if (Number.isNaN(num)) return undefined;
  return wasParenNegative ? -num : num;
}

/**
 * Format a numeric string as Norwegian NOK currency (no decimals).
 */
export function formatCurrency(amount: string): string | undefined {
  const num = toNumber(amount);
  if (num === undefined) return undefined;
  return new Intl.NumberFormat("no-NO", {
    style: "currency",
    currency: "NOK",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}
