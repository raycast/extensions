import { format, parseISO, subDays } from "date-fns";

export const DATE_FORMAT = "yyyy-MM-dd";

export function getToday_YYYYMMDD(): string {
  return format(new Date(), DATE_FORMAT);
}

export function formatDate_YYYYMMDD(date: Date): string {
  return format(date, DATE_FORMAT);
}

export function parseDate_YYYYMMDD(dateStr: string): Date {
  return parseISO(dateStr);
}

export function getYesterday_YYYYMMDD(): string {
  return format(subDays(new Date(), 1), DATE_FORMAT);
}
