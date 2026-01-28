import { calculateValue, groupRecordsPerDay, sumRecordsTime } from "../helpers/tim";

import { useData } from "../state/data";
import { UUID } from "../types/tim";

export function useTask(id: UUID) {
  const { data, isLoading, error } = useData();

  if (!data) {
    return { isLoading, error };
  }

  const task = data.tasks[id];
  const tags = task.tags?.map((id) => data.tags[id]);

  const { parent } = data.nodes.find((node) => node.id === id && node.parent) ?? {};
  if (parent) {
    const { rate } = data.groups[parent];
    task.rate ??= rate;
  }

  const recordsPerDay = groupRecordsPerDay(task.records, task.rate);
  const activeDays = recordsPerDay.length;
  const totalTime = sumRecordsTime(task.records);

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
