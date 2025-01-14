import { showToast, Toast } from "@raycast/api";

export interface ParsedSchedule {
  days: string[];
  from: string;
  to: string;
}

export async function extractSchedule(text: string): Promise<ParsedSchedule | null> {
  const daysOfWeek = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
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

  // Extract mentioned days
  const mentionedDays = daysOfWeek.filter((day) => inputText.includes(day));

  // Handle the "except" case
  if (inputText.includes("except")) {
    if (mentionedDays.length === 0) {
      await showToast(Toast.Style.Failure, "Oops! Please mention the days to be excluded.");
      return null;
    }
    const allDaysExcept = daysOfWeek.filter((day) => !mentionedDays.includes(day));
    return { days: allDaysExcept, from: fromTime, to: toTime };
  }

  // If no specific days are mentioned, assume all days
  const days = mentionedDays.length > 0 ? mentionedDays : daysOfWeek;

  return { days, from: fromTime, to: toTime };
}
