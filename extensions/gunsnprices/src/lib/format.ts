/** "$1,234.50" */
export function formatMoney(value: number): string {
  return "$" + value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Cost per round: "$0.38", or three decimals below ten cents ("$0.066"). */
export function formatPerRound(value: number): string {
  return "$" + value.toFixed(value < 0.1 ? 3 : 2);
}

/** "1,000" */
export function formatCount(value: number): string {
  return value.toLocaleString("en-US");
}

/**
 * Read a price typed by a person: "18.99", "$18.99", "$1,299.00", "18.99 USD".
 * Returns null for anything that is not a positive amount.
 */
export function parsePrice(text: string | undefined | null): number | null {
  if (!text) return null;
  const s = text
    .trim()
    .replace(/^(?:US\$|\$|USD)\s*/i, "")
    .replace(/\s*(?:USD|\$)$/i, "")
    .trim();
  if (!/^(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?$|^\.\d+$/.test(s)) return null;
  const n = parseFloat(s.replace(/,/g, ""));
  return n > 0 ? n : null;
}

/** Escape text for a Markdown table cell. */
export function cell(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}
