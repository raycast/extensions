import reminders from "swift:../swift/reminders";

import { Priority, Reminder, List, Location } from "./hooks/useData";

export async function getData() {
  return await reminders.get<{ reminders: Reminder[]; lists: List[] }>();
}

export type Frequency = "daily" | "weekly" | "monthly" | "yearly";
export type NewReminder = {
  title: string;
  listId?: string;
  notes?: string;
  dueDate?: string;
  priority?: string;
  recurrence?: {
    frequency: Frequency;
    interval: number;
    endDate?: string;
  };
  address?: string;
  proximity?: string;
  radius?: number;
};

export async function createReminder(reminder: NewReminder): Promise<Reminder> {
  const result = await reminders.create<Reminder>(reminder);
  return result;
}

export async function toggleCompletionStatus(reminderId: string) {
  return (await reminders.toggleCompletionStatus)<{ status: string }>(reminderId);
}

export async function setTitleAndNotes(reminderId: string, title: string, notes?: string) {
  return (await reminders.setTitleAndNotes)<{ status: string }>({ reminderId, title, notes });
}

export async function setReminderPriority(reminderId: string, priority: Priority) {
  return (await reminders.setPriority)<{ status: string }>({ reminderId, priority });
}

export async function setReminderDueDate(reminderId: string, dueDate: string | null) {
  return await reminders.setDueDate<{ status: string }>({ reminderId, dueDate });
}

export async function setLocation(reminderId: string, values: Location) {
  return (await reminders.setLocation)<{ status: string }>({ reminderId, ...values });
}

export async function deleteReminder(reminderId: string) {
  return await reminders.deleteReminder<{ status: string }>(reminderId);
}
