export function normalizeInput(input: string): string {
  return input.trim().toLowerCase().replace(/,/g, "").replace(/\s+/g, " ");
}

export function formatInternational(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 6,
  }).format(value);
}

export function formatIndian(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 6,
  }).format(value);
}

export function formatCompact(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 3,
  }).format(value);
}

export function formatDecimal(value: number, maximumFractionDigits = 6): string {
  if (!Number.isFinite(value)) return String(value);

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits,
  }).format(value);
}

export function trimNumber(value: number, maximumFractionDigits = 8): string {
  if (!Number.isFinite(value)) return String(value);
  if (Number.isInteger(value)) return String(value);

  return value.toFixed(maximumFractionDigits).replace(/\.?0+$/, "");
}
