import { Color, Icon, List } from "@raycast/api";
import { MutatePromise } from "@raycast/utils";
import { format } from "date-fns";

import { getPriorityIcon, isOverdue } from "../helpers";
import { Reminder, List as TList } from "../hooks/useData";
import { ViewProps } from "../hooks/useViewReminders";

import ReminderActions from "./ReminderActions";

type ReminderListItemProps = {
  reminder: Reminder;
  mutate: MutatePromise<{ reminders: Reminder[]; lists: TList[] } | undefined>;
  listId?: string;
  displayCompletionDate: boolean;
  viewProps: ViewProps;
};

export default function ReminderListItem({
  reminder,
  listId,
  displayCompletionDate,
  viewProps,
  mutate,
}: ReminderListItemProps) {
  const keywords = [reminder.title];
  const accessories: List.Item.Accessory[] = [];

  const overdue = reminder.dueDate ? isOverdue(reminder.dueDate) : false;

  if (displayCompletionDate && reminder.completionDate) {
    const completionDate = new Date(reminder.completionDate);
    accessories.push({
      icon: Icon.CheckCircle,
      date: completionDate,
      tooltip: `Completion date: ${format(completionDate, "EEEE dd MMMM yyyy 'at' HH:mm")}`,
    });

    keywords.push(format(completionDate, "dd"), format(completionDate, "MMMM"));
  }

  if (reminder.isRecurring) {
    accessories.push({
      icon: Icon.Repeat,
      tooltip: reminder.recurrenceRule,
    });
  }

  if (reminder.dueDate) {
    const dueDate = new Date(reminder.dueDate);
    accessories.push({
      icon: { source: Icon.Calendar, tintColor: overdue ? Color.Red : undefined },
      date: { value: dueDate, color: overdue ? Color.Red : undefined },
      tooltip: `Due date: ${format(dueDate, "EEEE dd MMMM yyyy 'at' HH:mm")}`,
    });

    keywords.push(format(dueDate, "dd"), format(dueDate, "MMMM"));
  }

  if (reminder.priority) {
    accessories.push({
      icon: getPriorityIcon(reminder.priority),
      tooltip: `Priority: ${reminder.priority === "high" ? "High" : reminder.priority === "medium" ? "Medium" : "Low"}`,
    });

    keywords.push(reminder.priority);
  }

  if (listId === "all" && reminder.list) {
    accessories.push({
      icon: { source: Icon.Dot, tintColor: reminder.list.color },
      tooltip: reminder.list.title,
    });

    keywords.push(reminder.list.title);
  }

  if (reminder.notes) {
    keywords.push(...reminder.notes.split(" "));
  }

  return (
    <List.Item
      icon={reminder.isCompleted ? { source: Icon.CheckCircle, tintColor: Color.Green } : Icon.Circle}
      key={reminder.id}
      title={reminder.title}
      subtitle={reminder.notes}
      accessories={accessories}
      keywords={keywords}
      actions={<ReminderActions reminder={reminder} viewProps={viewProps} listId={listId} mutate={mutate} />}
    />
  );
}
