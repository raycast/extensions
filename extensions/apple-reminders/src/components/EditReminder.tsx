import { ActionPanel, Action, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, MutatePromise, useForm } from "@raycast/utils";
import { format } from "date-fns";
import {
  setTitleAndNotes,
  moveToList,
  setPriorityStatus,
  setDueDate as setReminderDueDate,
  setEarlyReminder as setReminderEarlyReminder,
} from "swift:../../swift/AppleReminders";

import { applyTagsToNotes, extractTagsFromNotes, formatTags, getPriorityIcon, parseReminderDueDate } from "../helpers";
import { EARLY_REMINDER_OPTIONS, formatEarlyReminder } from "../helpers/early-reminder";
import { List, Priority, Reminder, useData } from "../hooks/useData";

type EditReminderProps = {
  reminder: Reminder;
  mutate: MutatePromise<{ reminders: Reminder[]; lists: List[] } | undefined>;
};

export default function EditReminder({ reminder, mutate }: EditReminderProps) {
  const { pop } = useNavigation();
  const { data } = useData();
  const lists = data?.lists || [];

  const initialNotesData = extractTagsFromNotes(reminder.notes);
  const initialDueDate = parseReminderDueDate(reminder.dueDate);
  const initialEarlyReminder = reminder.earlyReminder ? String(Math.round(reminder.earlyReminder)) : "";

  const earlyReminderOptions: { label: string; value: string }[] = [...EARLY_REMINDER_OPTIONS];
  if (
    reminder.earlyReminder &&
    !EARLY_REMINDER_OPTIONS.some((opt) => opt.value === String(Math.round(reminder.earlyReminder!)))
  ) {
    earlyReminderOptions.push({
      label: formatEarlyReminder(reminder.earlyReminder),
      value: String(Math.round(reminder.earlyReminder)),
    });
  }

  const { itemProps, handleSubmit, values } = useForm<{
    title: string;
    dueDate: Date | null;
    earlyReminder: string;
    notes: string;
    priority: string;
    tags: string;
    listId: string;
  }>({
    async onSubmit(formValues) {
      try {
        const newNotes = applyTagsToNotes(formValues.notes, formValues.tags) ?? "";
        const titleOrNotesChanged = formValues.title !== reminder.title || newNotes !== (reminder.notes ?? "");
        const priorityChanged = formValues.priority !== (reminder.priority || "");
        const listChanged = formValues.listId !== (reminder.list?.id || "");

        let newDueDate: string | null = null;
        if (formValues.dueDate) {
          newDueDate = Form.DatePicker.isFullDay(formValues.dueDate)
            ? format(formValues.dueDate, "yyyy-MM-dd")
            : formValues.dueDate.toISOString();
        }
        const dueDateChanged = newDueDate !== (reminder.dueDate ?? null);

        const newEarlySeconds = formValues.earlyReminder ? Number(formValues.earlyReminder) : null;
        const earlyReminderChanged =
          newEarlySeconds !== (reminder.earlyReminder ? Math.round(reminder.earlyReminder) : null);

        if (titleOrNotesChanged) {
          await mutate(setTitleAndNotes({ reminderId: reminder.id, title: formValues.title, notes: newNotes }), {
            optimisticUpdate(data) {
              if (!data) return;

              return {
                ...data,
                reminders: data.reminders.map((r) => {
                  if (reminder.id === r.id) {
                    return { ...r, title: formValues.title, notes: newNotes };
                  }
                  return r;
                }),
              };
            },
          });
        }
        if (dueDateChanged) {
          await mutate(
            setReminderDueDate({
              reminderId: reminder.id,
              dueDate: newDueDate,
              earlyReminder: newEarlySeconds ?? 0,
            }),
            {
              optimisticUpdate(data) {
                if (!data) return;

                return {
                  ...data,
                  reminders: data.reminders.map((r) => {
                    if (reminder.id === r.id) {
                      return { ...r, dueDate: newDueDate, earlyReminder: newEarlySeconds };
                    }
                    return r;
                  }),
                };
              },
            },
          );
        } else if (earlyReminderChanged) {
          await mutate(
            setReminderEarlyReminder({
              reminderId: reminder.id,
              earlyReminder: newEarlySeconds ?? 0,
            }),
            {
              optimisticUpdate(data) {
                if (!data) return;

                return {
                  ...data,
                  reminders: data.reminders.map((r) => {
                    if (reminder.id === r.id) {
                      return { ...r, earlyReminder: newEarlySeconds };
                    }
                    return r;
                  }),
                };
              },
            },
          );
        }
        if (priorityChanged) {
          await mutate(
            setPriorityStatus({ reminderId: reminder.id, priority: (formValues.priority || null) as Priority }),
            {
              optimisticUpdate(data) {
                if (!data) return;

                return {
                  ...data,
                  reminders: data.reminders.map((r) => {
                    if (reminder.id === r.id) {
                      return { ...r, priority: (formValues.priority || null) as Priority };
                    }
                    return r;
                  }),
                };
              },
            },
          );
        }
        if (listChanged) {
          await mutate(moveToList({ reminderId: reminder.id, listId: formValues.listId }), {
            optimisticUpdate(data) {
              if (!data) return;

              return {
                ...data,
                reminders: data.reminders.map((r) => {
                  if (reminder.id === r.id) {
                    return {
                      ...r,
                      list: data.lists.find((l) => l.id === formValues.listId) || null,
                    };
                  }
                  return r;
                }),
              };
            },
          });
        }

        pop();
      } catch (error) {
        console.log(error);
        await showToast({
          style: Toast.Style.Failure,
          title: `Unable to update reminder`,
        });
      }
    },
    initialValues: {
      title: reminder.title,
      dueDate: initialDueDate,
      earlyReminder: initialEarlyReminder,
      notes: initialNotesData.notes,
      priority: reminder.priority || "",
      tags: formatTags(initialNotesData.tags),
      listId: reminder.list?.id || "",
    },
    validation: {
      title: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Edit Reminder" onSubmit={handleSubmit} icon={Icon.Pencil} />
        </ActionPanel>
      }
    >
      <Form.TextField {...itemProps.title} title="Title" placeholder="New Reminder" />
      <Form.DatePicker {...itemProps.dueDate} title="Due Date" type={Form.DatePicker.Type.DateTime} />
      {values.dueDate && (
        <Form.Dropdown {...itemProps.earlyReminder} title="Early Reminder">
          {earlyReminderOptions.map((opt) => (
            <Form.Dropdown.Item key={opt.value} title={opt.label} value={opt.value} />
          ))}
        </Form.Dropdown>
      )}
      <Form.TextArea {...itemProps.notes} title="Notes" placeholder="Add some notes" />
      <Form.Dropdown {...itemProps.priority} title="Priority">
        <Form.Dropdown.Item title="None" value="" />
        <Form.Dropdown.Item title="High" value="high" icon={getPriorityIcon("high")} />
        <Form.Dropdown.Item title="Medium" value="medium" icon={getPriorityIcon("medium")} />
        <Form.Dropdown.Item title="Low" value="low" icon={getPriorityIcon("low")} />
      </Form.Dropdown>
      <Form.TextField
        {...itemProps.tags}
        title="Tags"
        placeholder="work, urgent or #work #urgent"
        info="Tags are formatted as native Apple Reminders hashtags and appended to notes."
      />
      <Form.Dropdown {...itemProps.listId} title="List">
        {lists.map((list) => (
          <Form.Dropdown.Item
            key={list.id}
            title={list.title}
            value={list.id}
            icon={{ source: Icon.Circle, tintColor: list.color }}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
