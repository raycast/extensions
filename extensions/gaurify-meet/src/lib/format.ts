import type { Booking } from "./api";

const JOIN_WINDOW_MS = 10 * 60 * 1000;

export function time(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/** "10:30" style, short enough for the menu bar. */
export function shortTime(iso: string): string {
  return new Date(iso)
    .toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    .replace(/\s?(AM|PM|am|pm)$/, "");
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** Today, Tomorrow, or "Thursday, 9 October". */
export function dayLabel(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  if (dayKey(d) === dayKey(now)) return "Today";
  if (dayKey(d) === dayKey(tomorrow)) return "Tomorrow";
  return d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
}

export function isToday(iso: string, now = new Date()): boolean {
  return dayKey(new Date(iso)) === dayKey(now);
}

/** Starts within 10 minutes, or has started and not ended. */
export function isJoinable(b: Booking, now = Date.now()): boolean {
  if (b.mode === "phone" || !b.meet_url) return false;
  return Date.parse(b.start_utc) - now <= JOIN_WINDOW_MS && Date.parse(b.end_utc) > now;
}

export function isLive(b: Booking, now = Date.now()): boolean {
  return Date.parse(b.start_utc) <= now && Date.parse(b.end_utc) > now;
}

export function minutes(n: number): string {
  if (n < 60) return `${n} min`;
  const h = Math.floor(n / 60);
  const m = n % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function firstName(name: string): string {
  return (name || "").trim().split(/\s+/)[0] || "Guest";
}

export function groupByDay<T>(items: T[], at: (x: T) => string): { label: string; items: T[] }[] {
  const out: { label: string; items: T[] }[] = [];
  for (const x of items) {
    const label = dayLabel(at(x));
    const last = out[out.length - 1];
    if (last && last.label === label) last.items.push(x);
    else out.push({ label, items: [x] });
  }
  return out;
}

/**
 * Three times that read well in an email: one per day where possible, the first sensible
 * slot of each day (not before 9 AM local when a later one exists), then fill from the rest.
 */
export function suggest(slots: string[], count = 3, now = Date.now()): string[] {
  const future = slots.filter((s) => Date.parse(s) > now + 30 * 60 * 1000);
  const byDay = new Map<string, string[]>();
  for (const s of future) {
    const k = dayKey(new Date(s));
    byDay.set(k, [...(byDay.get(k) || []), s]);
  }
  const picks: string[] = [];
  let i = 0;
  for (const list of byDay.values()) {
    if (picks.length >= count) break;
    // Alternate morning and afternoon so the guest gets a real choice.
    const wantPm = i % 2 === 1;
    const fit =
      list.find((s) => {
        const h = new Date(s).getHours();
        return wantPm ? h >= 13 : h >= 9;
      }) || list[0];
    picks.push(fit);
    i++;
  }
  for (const s of future) {
    if (picks.length >= count) break;
    if (!picks.includes(s)) picks.push(s);
  }
  return picks.sort();
}

export function longWhen(iso: string): string {
  const d = new Date(iso);
  const day = d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
  return `${day}, ${time(iso)}`;
}

export function tzName(): string {
  const parts = new Intl.DateTimeFormat(undefined, { timeZoneName: "long" }).formatToParts(new Date());
  return parts.find((p) => p.type === "timeZoneName")?.value || Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/** The text pasted into an email reply. */
export function timesMessage(picks: string[], link: string): string {
  const lines = picks.map((s) => `- ${longWhen(s)}`);
  return [
    "Here are a few times that work for me:",
    "",
    ...lines,
    "",
    `Times are in ${tzName()}.`,
    `Or pick any time that suits you: ${link}`,
  ].join("\n");
}

/** Minor units (paise, cents) to a price: "₹1,500" or "$25.00". */
export function money(minor: number, currency = "INR"): string {
  const cur = (currency || "INR").toUpperCase();
  return (minor / 100).toLocaleString(cur === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency: cur,
    maximumFractionDigits: cur === "INR" ? 0 : 2,
  });
}
