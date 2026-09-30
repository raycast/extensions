import { showToast, Toast } from "@raycast/api";
import { ParsedSchedule } from "./interfaces";

export type { ParsedSchedule };

export async function extractSchedule(text: string): Promise<ParsedSchedule | null> {
  const daysOfWeek = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const inputText = text.toLowerCase();

  // Extract the time range using a regex
  const timeRegex = /(\d{2}:\d{2})/g;
  const times = inputText.match(timeRegex);

  // Ensure that both fromTime and toTime are present
  if (!times || times.length < 2) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Enter both a start and end time",
      message: "Example: Monday from 09:00 to 17:00",
    });
    return null;
  }

  const [fromTime, toTime] = times;

  // Extract mentioned days
  const mentionedDays = daysOfWeek.filter((day) => inputText.includes(day));

  // Handle the "except" case
  if (inputText.includes("except")) {
    if (mentionedDays.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Enter the days to exclude",
        message: "Example: Every day except Saturday and Sunday from 09:00 to 17:00",
      });
      return null;
    }
    const allDaysExcept = daysOfWeek.filter((day) => !mentionedDays.includes(day));
    return { days: allDaysExcept, from: fromTime, to: toTime };
  }

  // If no specific days are mentioned, assume all days
  const days = mentionedDays.length > 0 ? mentionedDays : daysOfWeek;

  return { days, from: fromTime, to: toTime };
}
