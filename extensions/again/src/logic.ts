// Pure day logic, ported from tools/again/site/index.html and revised after the 22/10 expert review.
// No Raycast imports: tested with node.

export type Outcome = "done" | "some" | "not";
// `counted` remembers that the day was ever answered Done or Some, whatever the current answer says.
export type Day = { promise: string; outcome?: Outcome; auto?: boolean; prev?: Outcome; counted?: boolean };
export type State = { days: Record<string, Day> };
export type Screen = "first" | "welcome-back" | "choose" | "promise" | "closed";
export type Offer = { text: string; label?: string };

export const DAY_STARTS_AT = 4; // 1 a.m. still belongs to yesterday
export const WELCOME_BACK_AFTER = 3; // days since the last promise before the fresh-start screen
export const CORRECTION_WINDOW = 2; // days during which an auto-closed day can still be corrected
export const SUGGESTIONS = [
  "Reply to one message",
  "Open the file you're working on",
  "Write one sentence of the draft",
  "Close five tabs",
  "Step outside for 5 minutes",
];

const pad = (n: number) => String(n).padStart(2, "0");
const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Wall-clock hours, not elapsed time, so the day still turns at 4 on the night the clocks change.
export function dayKey(date: Date): string {
  const d = new Date(date);
  if (d.getHours() < DAY_STARTS_AT) d.setDate(d.getDate() - 1);
  return fmt(d);
}

export function addDays(key: string, n: number): string {
  const [y, m, d] = key.split("-").map(Number);
  return fmt(new Date(y, m - 1, d + n, 12));
}

export function daysBetween(a: string, b: string): number {
  const [y1, m1, d1] = a.split("-").map(Number);
  const [y2, m2, d2] = b.split("-").map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 864e5);
}

// A day left open closes itself. If the person had answered and then picked "change",
// the earlier answer comes back instead of turning into "not today".
export function autoClose(state: State, today: string): State {
  const days = { ...state.days };
  for (const [k, v] of Object.entries(days)) {
    if (k >= today || !v.promise || v.outcome) continue;
    const closed: Day = v.prev ? { ...v, outcome: v.prev } : { ...v, outcome: "not", auto: true };
    delete closed.prev;
    days[k] = closed;
  }
  return { ...state, days };
}

export function lastPromiseDay(state: State, before: string): string | null {
  return (
    Object.keys(state.days)
      .filter((k) => k < before && state.days[k].promise)
      .sort()
      .pop() ?? null
  );
}

const isShowUp = (o?: Outcome) => o === "done" || o === "some";
const counts = (d: Day) => d.counted === true || isShowUp(d.outcome) || isShowUp(d.prev);

// A day that counted once keeps counting, whatever it is changed to later, so the number never goes down.
export function showedUp(state: State): number {
  return Object.values(state.days).filter(counts).length;
}

// "Yesterday" only when it is; an older day that can still be corrected is named by its weekday.
export function dayLabel(key: string, today: string): string {
  if (daysBetween(key, today) === 1) return "Yesterday";
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d, 12).toLocaleDateString("en-US", { weekday: "long" });
}

// "Smaller" is a ladder: minutes are halved down to 2, then two fixed rungs. The last rung stays put.
const SPEND = "Spend 2 minutes on: ";
const OPEN = "Open it, nothing else: ";

// The thing itself, without any "smaller" wrapper: what "repeat" and "same" offer.
export function baseOf(text: string): string {
  for (const p of [OPEN, SPEND]) if (text.startsWith(p)) return text.slice(p.length);
  return text;
}

export function smaller(text: string): string {
  if (text.startsWith(OPEN)) return text;
  if (text.startsWith(SPEND)) return OPEN + text.slice(SPEND.length);
  // A range like "10-15 minutes" is left alone: halving only one end would be wrong.
  const m = text.match(/(?<![\d-])(\d+)\s*(min|mins|minutes|minute)\b(?!\s*-)/i);
  if (m && Number(m[1]) > 2) return text.replace(m[0], `${Math.max(2, Math.floor(Number(m[1]) / 2))} minutes`);
  if (m) return OPEN + text;
  return SPEND + text;
}

export function atFloor(text: string): boolean {
  return smaller(text) === text;
}

export function screenFor(state: State, today: string): Screen {
  const t = state.days[today];
  if (t?.promise && t.outcome) return "closed";
  if (t?.promise) return "promise";
  const last = lastPromiseDay(state, today);
  if (!last) return "first";
  if (daysBetween(last, today) >= WELCOME_BACK_AFTER) return "welcome-back";
  return "choose";
}

// Yesterday closed itself without an answer: the person may simply not have clicked. Offer to set it right.
export function correctionDay(state: State, today: string): string | null {
  const last = lastPromiseDay(state, today);
  if (!last) return null;
  const d = state.days[last];
  return d.outcome === "not" && d.auto && daysBetween(last, today) <= CORRECTION_WINDOW ? last : null;
}

// Labels belong to the first offer with that text; a label is used once.
function tidy(list: Offer[]): Offer[] {
  const seenText = new Set<string>();
  const seenLabel = new Set<string>();
  const out: Offer[] = [];
  for (const o of list) {
    if (!o.text || seenText.has(o.text.toLowerCase())) continue;
    seenText.add(o.text.toLowerCase());
    if (o.label && seenLabel.has(o.label)) out.push({ text: o.text });
    else {
      if (o.label) seenLabel.add(o.label);
      out.push(o);
    }
  }
  return out;
}

// What to offer when no promise is set yet: the first option is the extension's best guess.
export function offers(state: State, today: string): Offer[] {
  const s = screenFor(state, today);
  const lastK = lastPromiseDay(state, today);
  const last = lastK ? state.days[lastK] : null;
  if (s === "first" || !last) return SUGGESTIONS.map((text) => ({ text }));
  const base = baseOf(last.promise);
  const fresh = (n: number) =>
    SUGGESTIONS.filter((t) => t.toLowerCase() !== base.toLowerCase())
      .slice(0, n)
      .map((text) => ({ text }));
  if (s === "welcome-back") return tidy([...fresh(3), { text: smaller(base), label: "Where You Left Off" }]);
  if (last.outcome === "done") return tidy([...fresh(3), { text: base, label: "Repeat" }]);
  const step = smaller(last.promise);
  const small: Offer = step !== last.promise ? { text: step, label: "Smaller" } : { text: last.promise, label: "Same" };
  const same: Offer = { text: base, label: "Same" };
  // An unanswered day is not a failure: the plain thing comes first, the smaller one second.
  return tidy(last.auto ? [same, small, ...fresh(2)] : [small, same, ...fresh(2)]);
}

// State transitions used by both commands, so the menu bar and the list behave the same.
export function setPromise(state: State, today: string, text: string): State {
  const t = text.trim();
  if (!t) return state;
  const d = state.days[today];
  const prev = d?.outcome ?? d?.prev;
  const next: Day = prev ? { promise: t, prev } : { promise: t };
  if (d?.counted) next.counted = true;
  return { ...state, days: { ...state.days, [today]: next } };
}

export function answer(state: State, today: string, outcome: Outcome): State {
  const d = state.days[today];
  if (!d?.promise) return state;
  const next: Day = { ...d, outcome };
  delete next.prev;
  delete next.auto;
  if (counts(d) || isShowUp(outcome)) next.counted = true;
  return { ...state, days: { ...state.days, [today]: next } };
}

// Sets the answer on an earlier day (used for the "Yesterday" correction).
export function answerDay(state: State, key: string, outcome: Outcome): State {
  const d = state.days[key];
  if (!d?.promise) return state;
  const next: Day = { promise: d.promise, outcome };
  if (counts(d) || isShowUp(outcome)) next.counted = true;
  return { ...state, days: { ...state.days, [key]: next } };
}

export function reopen(state: State, today: string): State {
  const d = state.days[today];
  if (!d?.outcome) return state;
  const next: Day = { promise: d.promise, prev: d.outcome };
  if (counts(d)) next.counted = true;
  return { ...state, days: { ...state.days, [today]: next } };
}

// "Pick another thing". A reopened day keeps its earlier answer, so the count does not drop.
export function clearToday(state: State, today: string): State {
  const days = { ...state.days };
  const d = days[today];
  if (d && (d.prev || d.counted)) {
    const kept: Day = { promise: "" };
    if (d.prev) kept.prev = d.prev;
    if (counts(d)) kept.counted = true;
    days[today] = kept;
  } else delete days[today];
  return { ...state, days };
}

export const CLOSED_MESSAGE: Record<Outcome, string> = {
  done: "Done. That counts.",
  some: "Some counts too.",
  not: "Not today. That's okay.",
};
