import { Action, Tool } from "@raycast/api";
import { format } from "date-fns";
import { deleteReminder } from "swift:../../swift/AppleReminders";

type Input = {
  /** The ID of the reminder to delete */
  id: string;

  /** The reminder properties to display to the user */
  confirmation: {
    title: string;
    notes?: string;
    list?: { id: string; title: string; color: string };
    dueDate?: string;
    priority?: "high" | "medium" | "low";
    isRecurring?: string;
    recurrenceRule?: string;
  };
};

export default async function (input: Input) {
  await deleteReminder(input.id);
  return { id: input.id };
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const { title, notes, list, dueDate, priority, isRecurring, recurrenceRule } = input.confirmation;

  const info = [{ name: "Title", value: title }];

  if (notes) {
    info.push({ name: "Notes", value: notes });
  }

  if (list) {
    info.push({ name: "List", value: list.title });
  }

  if (dueDate) {
    const date = new Date(dueDate);
    info.push({ name: "Due Date", value: format(date, "PPP 'at' p") });
  }

  if (priority) {
    const priorityMap = { high: "High", medium: "Medium", low: "Low" };
    info.push({ name: "Priority", value: priorityMap[priority] });
  }

  if (isRecurring && recurrenceRule) {
    info.push({ name: "Recurrence", value: recurrenceRule });
  }

  return { style: Action.Style.Destructive, info };
};
