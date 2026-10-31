import type { ForecastResponse, ResetRecord } from "../api/forecast-schema";

export type HistoryFilter = "all" | "resets" | "announcements" | "banked";
export type HistoryItem = ResetRecord;

export function safeSourceUrl(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : undefined;
  } catch {
    return undefined;
  }
}
export function isConfirmedReset(record: ResetRecord): boolean {
  return record.type === "reset";
}
export function latestReset(response: ForecastResponse, now = new Date()): HistoryItem | undefined {
  const records = resetHistory(response, "resets").filter((record) => Date.parse(record.dateTime) <= now.getTime());
  const timestamp = response.lastResetAt;
  if (!timestamp || Date.parse(timestamp) > now.getTime()) return records[0];
  const match = records.find((record) => Date.parse(record.dateTime) === Date.parse(timestamp));
  if (match) return match;
  // The separately published timeline may briefly lag the forecast's canonical clock.
  return {
    id: `last-reset:${timestamp}`,
    sourceDate: new Date(timestamp).toISOString().slice(0, 10),
    dateTime: timestamp,
    title: "Last global reset",
    description:
      "The latest reset timestamp reported by codex-reset.com. The timeline has not supplied a matching record yet.",
    type: "reset",
    sourceLabel: "codex-reset.com",
    sourceUrl: "https://codex-reset.com/",
  };
}
export function resetHistory(response: ForecastResponse, filter: HistoryFilter = "all"): HistoryItem[] {
  return response.history
    .filter((record) => {
      if (filter === "resets") return isConfirmedReset(record);
      if (filter === "announcements") return record.type === "announcement";
      if (filter === "banked") return record.type === "banked-reset";
      return true;
    })
    .sort((a, b) => Date.parse(b.dateTime) - Date.parse(a.dateTime) || a.id.localeCompare(b.id));
}
export function recordLabel(record: ResetRecord): string {
  switch (record.type) {
    case "reset":
      return "Reset";
    case "banked-reset":
      return "Banked";
    case "announcement":
      return "Note";
    default:
      return record.title;
  }
}

export function bankedStatusLabel(record: ResetRecord): string | undefined {
  const state = record.bankedState;
  if (!state) return undefined;
  // The site's timeline renders its "unknown" banked state as "UPDATE".
  return state === "unknown" ? "Update" : state.charAt(0).toUpperCase() + state.slice(1);
}
