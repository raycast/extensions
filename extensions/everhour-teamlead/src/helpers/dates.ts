import { addWeeks, startOfWeek, endOfWeek, format, eachDayOfInterval } from "date-fns";

export function getWeekRange(offset: number) {
  const now = new Date();
  const shifted = addWeeks(now, offset);
  const start = startOfWeek(shifted, { weekStartsOn: 1 });
  const end = endOfWeek(shifted, { weekStartsOn: 1 });
  return {
    start,
    end,
    from: format(start, "yyyy-MM-dd"),
    to: format(end, "yyyy-MM-dd"),
  };
}

export function formatWeekLabel(offset: number): string {
  const { start, end } = getWeekRange(offset);
  const startStr = format(start, "d MMM");
  const endStr = format(end, "d MMM yyyy");
  return `${startStr} – ${endStr}`;
}

export function formatDayLabel(dateStr: string): string {
  const date = new Date(dateStr);
  return format(date, "EEEE, d MMM");
}

export function getWeekDays(offset: number): string[] {
  const { start, end } = getWeekRange(offset);
  return eachDayOfInterval({ start, end }).map((d) => format(d, "yyyy-MM-dd"));
}
