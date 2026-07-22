/** Formatting helpers — Italian money/date conventions, English UI copy. */

const eurFormatter = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });

export function eur(amount: number): string {
  return eurFormatter.format(amount);
}

/** Compact euro for the menu bar: "€ 12.4k" / "€ 850". */
export function eurCompact(amount: number): string {
  if (Math.abs(amount) >= 1000) {
    return `€ ${(amount / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  }
  return `€ ${Math.round(amount)}`;
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** Whole days a date is past (0 if today or future). */
export function daysLate(iso: string | null | undefined): number {
  if (!iso) return 0;
  const due = new Date(`${iso.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(due.getTime())) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor((today.getTime() - due.getTime()) / 86_400_000);
  return Math.max(0, diff);
}

export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayIso(): string {
  return toIsoDate(new Date());
}

/** ISO date N days from today. */
export function isoDaysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
}
