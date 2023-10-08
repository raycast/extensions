import dayjs from "dayjs";

import { useData } from "../state/data";
import { TaskRecord, UUID } from "../types/tim";

export const MS_PER_HOUR = 1000 * 60 * 60;

export function useTask(id: UUID) {
  const { data, isLoading, error } = useData();

  if (!data) {
    return { isLoading, error };
  }

  const task = data.tasks[id];
  const tags = task.tags.map((id) => data?.tags[id]);

  const { parent } = data.nodes.find((node) => node.id === id && node.parent) ?? {};
  if (parent) {
    const { rate } = data.groups[parent];
    task.rate ??= rate;
  }

  const recordsPerDay = groupRecordsPerDay(task.records, task.rate);
  const activeDays = recordsPerDay.length;
  const totalTime = task.records.map(({ start, end }) => end - start).reduce((sum, acc) => sum + acc, 0);

  const averagePerDay = totalTime > 0 ? totalTime / activeDays : 0;

  return {
    isLoading,
    error,
    task,
    tags,
    recordsPerDay,
    activeDays,
    totalTime,
    averagePerDay,
    value: calculateValue(totalTime, task.rate),
  };
}

function calculateValue(ms: number, rate = 0) {
  const timeInHours = ms / MS_PER_HOUR;
  return timeInHours * rate;
}

function groupRecordsPerDay(records: TaskRecord[], rate = 0) {
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
