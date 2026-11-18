import { isSameLocalDay } from "./date";

export function formatInputTime(value: Date): string {
  return `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`;
}

export type DateTimeInputResult = {
  value?: Date;
  dateError?: string;
  timeError?: string;
};

export function parseLocalDateTime(date: Date | null, time: string, original?: Date): DateTimeInputResult {
  const dateError = !date || !Number.isFinite(date.getTime()) ? "Select a valid date" : undefined;
  const timeError = /^([01]\d|2[0-3]):[0-5]\d$/.test(time) ? undefined : "Enter a time in HH:mm format (00:00–23:59)";
  if (dateError || timeError) return { dateError, timeError };

  if (original && isSameLocalDay(date!, original) && time === formatInputTime(original)) {
    // Editing another field must not discard the saved seconds or choose a
    // different occurrence of an unchanged time during a daylight-saving fold.
    return { value: new Date(original.getTime()) };
  }

  const [hours, minutes] = time.split(":").map(Number);
  const value = new Date(date!.getFullYear(), date!.getMonth(), date!.getDate(), hours, minutes);
  if (!isSameLocalDay(value, date!) || value.getHours() !== hours || value.getMinutes() !== minutes) {
    return { timeError: "This local time does not exist on the selected date" };
  }
  return { value };
}
