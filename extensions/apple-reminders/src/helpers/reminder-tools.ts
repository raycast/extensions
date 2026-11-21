import type { NewReminder } from "../create-reminder";
import { parseTags } from "../helpers";

export function getRecurrenceConfirmationInfo(recurrence: NonNullable<NewReminder["recurrence"]>, dueDate?: string) {
  return [
    { name: "Frequency", value: recurrence.frequency },
    { name: "Interval", value: String(recurrence.interval) },
    { name: "Due Date", value: dueDate },
    { name: "Recurrence End Date", value: recurrence.endDate },
  ];
}

export function normalizeReminderToolInput<T extends { dueDate?: string; tags?: string }>(input: T) {
  const { tags, ...payload } = input;
  return {
    ...payload,
    ...(input.dueDate?.includes("T") ? { dueDate: new Date(input.dueDate).toISOString() } : {}),
    tags: tags ? parseTags(tags) : undefined,
  };
}
