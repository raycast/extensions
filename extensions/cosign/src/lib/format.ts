const compact = (currency: string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency, notation: "compact", maximumFractionDigits: 1 });

export function money(value: { amount: number; currency: string } | null | undefined): string | undefined {
  return value ? compact(value.currency).format(value.amount) : undefined;
}

function toDate(input: number | string | null | undefined): Date | undefined {
  if (input == null) return undefined;
  const date = new Date(input);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export const day = (input: number | string | null | undefined) =>
  toDate(input)?.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

export const monthDay = (input: number | string | null | undefined) =>
  toDate(input)?.toLocaleDateString("en-US", { month: "short", day: "numeric" });

export const year = (input: number | string | null | undefined) => toDate(input)?.getFullYear();

/** One line, cut at `max` characters with an ellipsis. Menu bar rows have no room to wrap. */
export function truncate(text: string, max: number): string {
  const line = text.replace(/\s+/g, " ").trim();
  return line.length > max ? `${line.slice(0, max - 1).trimEnd()}…` : line;
}

/** "series_d_plus" -> "Series d+". */
export const humanize = (value: string) => {
  const text = value.replace(/_plus$/, "+").replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
};
