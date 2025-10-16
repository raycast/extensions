import moment from "moment";

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "unknown error";
}

export function unixTimestampToDate(unix: number): Date {
  return new Date(unix * 1000);
}

export function getWeekday(date: Date): string {
  const d = moment(date);
  return d.locale("en").format("dddd");
}

export function getDay(date: Date): string {
  return date.toLocaleDateString("default", { day: "numeric" });
}

export function getMonth(date: Date): string {
  return date.toLocaleDateString("default", { month: "long" });
}

export function getHour(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
