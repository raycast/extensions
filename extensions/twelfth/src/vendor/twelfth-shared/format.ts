// Pure formatting, shared by the views and the AI tools.

/** A price in the workspace's currency. Unmeasured figures are null and show as a dash, never as zero. */
export function money(value: number | null | undefined, currency: string | undefined): string {
  if (value === null || value === undefined) return "—";
  // Until the workspace's currency is known, a bare amount beats a wrong symbol.
  if (!currency) return value.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  try {
    return new Intl.NumberFormat("en-AU", { style: "currency", currency, currencyDisplay: "narrowSymbol" }).format(
      value,
    );
  } catch {
    // An unknown code still reads correctly as "12.50 XYZ".
    return `${value.toFixed(2)} ${currency}`;
  }
}

/** A person's name the way they asked the app to show names. */
export function personName(name: string | null | undefined, format: "full_name" | "first_name"): string | undefined {
  const trimmed = name?.trim();
  if (!trimmed) return undefined;
  return format === "first_name" ? trimmed.split(/\s+/)[0] : trimmed;
}
