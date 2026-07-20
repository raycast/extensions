const UI_LOCALE = "en-US";

export function formatMoney(value: number, currency: string, locale: string): string {
  if (!Number.isFinite(value)) return "—";
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(UI_LOCALE, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function formatDayHeader(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  if (sameDay(d, today)) return "Today";
  if (sameDay(d, yesterday)) return "Yesterday";

  return new Intl.DateTimeFormat(UI_LOCALE, {
    day: "2-digit",
    month: "long",
    year: today.getFullYear() === d.getFullYear() ? undefined : "numeric",
  }).format(d);
}

export function currentMonthName(): string {
  return new Intl.DateTimeFormat(UI_LOCALE, { month: "long" }).format(new Date());
}

export function relativeTime(tsMs: number): string {
  const diffSec = Math.round((Date.now() - tsMs) / 1000);
  const rtf = new Intl.RelativeTimeFormat(UI_LOCALE, { numeric: "auto" });
  if (Math.abs(diffSec) < 60) return rtf.format(-diffSec, "second");
  const min = Math.round(diffSec / 60);
  if (Math.abs(min) < 60) return rtf.format(-min, "minute");
  const h = Math.round(min / 60);
  if (Math.abs(h) < 24) return rtf.format(-h, "hour");
  const d = Math.round(h / 24);
  return rtf.format(-d, "day");
}
