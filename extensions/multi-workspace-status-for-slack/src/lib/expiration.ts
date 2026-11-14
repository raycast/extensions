export const DURATIONS = [
  { value: "none", title: "Don't Clear" },
  { value: "30m", title: "30 Minutes" },
  { value: "1h", title: "1 Hour" },
  { value: "2h", title: "2 Hours" },
  { value: "4h", title: "4 Hours" },
  { value: "today", title: "Today" },
  { value: "week", title: "This Week" },
] as const;

export type Duration = (typeof DURATIONS)[number]["value"];

const toSeconds = (date: Date) => Math.floor(date.getTime() / 1000);

export function expirationFor(duration: string, now: Date = new Date()): number {
  const minutes = { "30m": 30, "1h": 60, "2h": 120, "4h": 240 }[duration];
  if (minutes) {
    return toSeconds(now) + minutes * 60;
  }
  if (duration === "today" || duration === "week") {
    const end = new Date(now);
    if (duration === "week") {
      // Sunday is the last day of the week.
      end.setDate(end.getDate() + ((7 - end.getDay()) % 7));
    }
    end.setHours(23, 59, 59, 0);
    return toSeconds(end);
  }
  return 0;
}
