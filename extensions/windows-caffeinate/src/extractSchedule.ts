import { showToast, Toast } from "@raycast/api";
import { ParsedSchedule } from "./interfaces";

export type { ParsedSchedule };

const DAY_ABBREVIATIONS: Record<string, string> = {
  mon: "monday",
  tue: "tuesday",
  tues: "tuesday",
  wed: "wednesday",
  weds: "wednesday",
  thu: "thursday",
  thur: "thursday",
  thurs: "thursday",
  fri: "friday",
  sat: "saturday",
  sun: "sunday",
};

export async function extractSchedule(text: string): Promise<ParsedSchedule | null> {
  const daysOfWeek = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const weekdays = ["monday", "tuesday", "wednesday", "thursday", "friday"];
  const weekendDays = ["saturday", "sunday"];
  const inputText = text.toLowerCase();

  // Extract the time range using a regex
  const timeRegex = /(\d{2}:\d{2})/g;
  const times = inputText.match(timeRegex);

  // Ensure that both fromTime and toTime are present
  if (!times || times.length < 2) {
    await showToast(Toast.Style.Failure, "Oops! Please specify both 'from' and 'to' times in HH:MM format.");
    return null;
  }

  const [fromTime, toTime] = times;

  const hasWord = (word: string) => new RegExp(`\\b${word}\\b`).test(inputText);

  // Recognize full names, 3-4 letter abbreviations ("mon", "thurs"), and the
  // "weekday(s)"/"weekend(s)" keywords. Previously only full weekday names
  // were matched, so inputs like "weekdays", "weekends", or "mon" matched
  // nothing and silently fell through to "assume all seven days" below.
  const mentionedDays = new Set<string>();
  for (const day of daysOfWeek) {
    if (hasWord(day)) mentionedDays.add(day);
  }
  for (const [abbr, fullDay] of Object.entries(DAY_ABBREVIATIONS)) {
    if (hasWord(abbr)) mentionedDays.add(fullDay);
  }
  if (hasWord("weekdays?")) {
    weekdays.forEach((day) => mentionedDays.add(day));
  }
  if (hasWord("weekends?")) {
    weekendDays.forEach((day) => mentionedDays.add(day));
  }

  // Handle the "except" case
  if (inputText.includes("except")) {
    if (mentionedDays.size === 0) {
      await showToast(Toast.Style.Failure, "Oops! Please mention the days to be excluded.");
      return null;
    }
    const allDaysExcept = daysOfWeek.filter((day) => !mentionedDays.has(day));
    return { days: allDaysExcept, from: fromTime, to: toTime };
  }

  // If no specific days are mentioned, assume all days
  const days = mentionedDays.size > 0 ? Array.from(mentionedDays) : daysOfWeek;

  return { days, from: fromTime, to: toTime };
}
