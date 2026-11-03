const compact = (currency: string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency, notation: "compact", maximumFractionDigits: 1 });

export function money(value: { amount: number; currency: string } | null | undefined): string | undefined {
  return value ? compact(value.currency).format(value.amount) : undefined;
}

export function day(input: number | string | null | undefined): string | undefined {
  if (input == null) return undefined;
  const date = new Date(input);
  return Number.isNaN(date.getTime())
    ? undefined
    : date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
