import { WorkspaceSettings } from "./types";

/** Calendar date (YYYY-MM-DD) in the given IANA timezone, falling back to the local timezone. */
export function todayIn(timeZone: string | undefined, now: Date = new Date()): string {
  if (timeZone) {
    try {
      const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).formatToParts(now);
      const get = (type: string) => parts.find((p) => p.type === type)?.value;
      const year = get("year");
      const month = get("month");
      const day = get("day");
      if (year && month && day) return `${year}-${month}-${day}`;
    } catch {
      // Unknown timezone: use the local date below.
    }
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export type EntryModePreference = "company" | "duration" | "start_end";

/** "company" follows Keito's manual entry format; anything other than a start/end format means duration. */
export function resolveEntryMode(
  preference: EntryModePreference | undefined,
  settings: Pick<WorkspaceSettings, "manualEntryFormat"> | undefined,
): "duration" | "start_end" {
  if (preference === "duration" || preference === "start_end") return preference;
  return /start|end|time/i.test(settings?.manualEntryFormat ?? "") ? "start_end" : "duration";
}
