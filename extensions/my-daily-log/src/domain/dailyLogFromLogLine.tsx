import { DailyLog } from "./DailyLog";

export function dailyLogFromLogLine(line: string, date: Date): DailyLog {
  const [time, title] = line.split(": ");
  const [hour, minute, second] = time.split(" ")[1].split(":");
  const logDate = new Date(date);
  logDate.setHours(parseInt(hour));
  logDate.setMinutes(parseInt(minute));
  logDate.setSeconds(parseInt(second));
  return new DailyLog(logDate, title);
}
