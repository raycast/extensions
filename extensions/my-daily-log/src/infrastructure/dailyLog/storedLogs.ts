import { randomUUID } from "crypto";
import { DailyLog } from "../../domain/dailyLog/DailyLog";

type StoredLog = { id?: unknown; date?: unknown; title?: unknown };

/** Parses the content of a `YYYY-MM-DD.json` file. Throws a descriptive error when the content is invalid. */
export function parseStoredLogs(json: string): DailyLog[] {
  if (json.trim().length === 0) {
    return [];
  }
  const parsed: unknown = JSON.parse(json);
  if (!Array.isArray(parsed)) {
    throw new Error("expected a list of logs");
  }
  return parsed.map((item: StoredLog, index) => {
    const date = new Date(typeof item?.date === "string" || typeof item?.date === "number" ? item.date : NaN);
    if (isNaN(date.getTime())) {
      throw new Error(`log #${index + 1} has an invalid date`);
    }
    const id = typeof item.id === "string" && item.id.length > 0 ? item.id : randomUUID();
    return new DailyLog(id, date, typeof item.title === "string" ? item.title : String(item.title ?? ""));
  });
}
