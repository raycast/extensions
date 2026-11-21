import { dailyJotName, noteUrl } from "../lib/api";
import { amplenote } from "../lib/amplenote";
import { describeError } from "./shared";

type Input = {
  /**
   * Which day's jot to look up, relative to today: 0 is today (default), -1 yesterday, 1 tomorrow.
   */
  daysFromToday?: number;
};

function localDate(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Look up a Daily Jot and the date it belongs to. Returns the jot's name and, if it exists, its noteUUID and link,
 * plus the date, weekday, current local time, and time zone. Does not create the jot.
 * Also use it to find out today's date before resolving relative dates like "tomorrow".
 */
export default async function (input: Input = {}) {
  try {
    const now = new Date();
    const day = new Date(now);
    day.setDate(now.getDate() + Math.max(-365, Math.min(365, Math.round(input.daysFromToday ?? 0))));
    const jot = await amplenote.findDailyJot(day);
    return {
      date: localDate(day),
      weekday: day.toLocaleDateString("en-US", { weekday: "long" }),
      currentTime: now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      dailyJot: {
        name: dailyJotName(day),
        exists: !!jot,
        noteUUID: jot?.uuid ?? null,
        url: jot ? noteUrl(jot.uuid) : null,
      },
    };
  } catch (error) {
    describeError(error);
  }
}
