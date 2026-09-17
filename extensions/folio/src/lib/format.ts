/** Formatting helpers. Pure: no Raycast imports, safe to unit test. */

export const MASK = "••••••";

function safeCurrency(code?: string | null): string {
  const c = (code ?? "").toUpperCase();
  return /^[A-Z]{3}$/.test(c) ? c : "USD";
}

/** "$12,345.67" / "C$1,234" style via Intl; falls back to plain number if the currency is unknown. */
export function formatMoney(
  amount: number | null | undefined,
  currency?: string | null,
  opts?: { compact?: boolean },
): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return "—";
  const code = safeCurrency(currency);
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      currencyDisplay: "narrowSymbol",
      notation: opts?.compact ? "compact" : "standard",
      maximumFractionDigits: opts?.compact ? 1 : 2,
      minimumFractionDigits: opts?.compact ? 0 : 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${code}`;
  }
}

/** Money with an explicit currency code suffix, e.g. "$12,345.67 CAD". */
export function formatMoneyWithCode(
  amount: number | null | undefined,
  currency?: string | null,
  opts?: { compact?: boolean },
): string {
  const base = formatMoney(amount, currency, opts);
  if (base === "—") return base;
  return `${base} ${safeCurrency(currency)}`;
}

export function formatSigned(amount: number | null | undefined, currency?: string | null): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return "—";
  const sign = amount > 0 ? "+" : amount < 0 ? "−" : "";
  return `${sign}${formatMoney(Math.abs(amount), currency)}`;
}

export function formatPercent(ratio: number | null | undefined, digits = 1): string {
  if (ratio === null || ratio === undefined || !Number.isFinite(ratio)) return "—";
  return `${(ratio * 100).toFixed(digits)}%`;
}

export function formatSignedPercent(ratio: number | null | undefined, digits = 1): string {
  if (ratio === null || ratio === undefined || !Number.isFinite(ratio)) return "—";
  const sign = ratio > 0 ? "+" : ratio < 0 ? "−" : "";
  return `${sign}${(Math.abs(ratio) * 100).toFixed(digits)}%`;
}

export function formatUnits(units: number | null | undefined): string {
  if (units === null || units === undefined) return "—";
  return Number.isInteger(units) ? units.toString() : units.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function formatRelativeDays(days: number | null): string {
  if (days === null) return "—";
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

/** Applies the privacy mask when enabled. Keep every money display behind this. */
export function mask(value: string, privacy: boolean): string {
  return privacy ? MASK : value;
}

export function pluralize(n: number, singular: string, plural = `${singular}s`): string {
  return `${n} ${n === 1 ? singular : plural}`;
}
