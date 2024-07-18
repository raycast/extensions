import dayjs from "dayjs";

import { TaskRecord } from "../types/tim";

export type RecordsPerDay = ReturnType<typeof groupRecordsPerDay>;
export type RecordPerDay = RecordsPerDay[number];

export const MS_PER_SECOND = 1000;
export const MS_PER_MINUTE = MS_PER_SECOND * 60;
export const MS_PER_HOUR = MS_PER_MINUTE * 60;

export function groupRecordsPerDay(records: TaskRecord[], rate = 0) {
  const map: Record<string, TaskRecord[]> = {};
  records.forEach((record) => {
    const startDate = dayjs(record.start).format("YYYY-MM-DD");
    if (map[startDate]) {
      map[startDate].push(record);
    } else {
      map[startDate] = [record];
    }
  });

  const recordsPerDay = Object.entries(map)
    .map(([date, records]) => {
      const totalTime = records.reduce((sum, acc) => sum + (acc.end - acc.start), 0);
      const notes = records
        .map((record) => record.note)
        .filter(Boolean)
        .join(", ");

      return {
        date,
        records,
        totalTime,
        notes,
        value: calculateValue(totalTime, rate),
      };
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return recordsPerDay;
}

export function sumRecordsTime(records: TaskRecord[]) {
  return records.map(({ start, end }) => end - start).reduce((sum, acc) => sum + acc, 0);
}

export function calculateValue(ms: number, rate = 0) {
  if (rate === 0) return 0;
  const timeInHours = ms / MS_PER_HOUR;
  return timeInHours * rate;
}

export function getHours(ms: number): number {
  if (ms === 0) return 0;

  return Math.floor(ms / MS_PER_HOUR);
}

export function getMinutes(ms: number): number {
  if (ms === 0) return 0;

  return Math.floor((ms - getHours(ms) * MS_PER_HOUR) / MS_PER_MINUTE);
}
