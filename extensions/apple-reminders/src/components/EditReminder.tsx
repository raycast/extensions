import { ActionPanel, Action, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, MutatePromise, useForm } from "@raycast/utils";
import { setTitleAndNotes, moveToList, setPriorityStatus } from "swift:../../swift/AppleReminders";

import { applyTagsToNotes, extractTagsFromNotes, formatTags, getPriorityIcon } from "../helpers";
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

  const { itemProps, handleSubmit } = useForm<{
    title: string;
    notes: string;
    priority: string;
    tags: string;
    listId: string;
  }>({
    async onSubmit(values) {
      try {
        const newNotes = applyTagsToNotes(values.notes, values.tags) ?? "";
        const titleOrNotesChanged = values.title !== reminder.title || newNotes !== (reminder.notes ?? "");
        const priorityChanged = values.priority !== (reminder.priority || "");
        const listChanged = values.listId !== (reminder.list?.id || "");

        if (titleOrNotesChanged) {
          await mutate(setTitleAndNotes({ reminderId: reminder.id, title: values.title, notes: newNotes }), {
            optimisticUpdate(data) {
              if (!data) return;

              return {
                ...data,
                reminders: data.reminders.map((r) => {
                  if (reminder.id === r.id) {
                    return { ...r, title: values.title, notes: newNotes };
                  }
                  return r;
                }),
              };
            },
          });
        }
        if (priorityChanged) {
          await mutate(
            setPriorityStatus({ reminderId: reminder.id, priority: (values.priority || null) as Priority }),
            {
              optimisticUpdate(data) {
                if (!data) return;

                return {
                  ...data,
                  reminders: data.reminders.map((r) => {
                    if (reminder.id === r.id) {
                      return { ...r, priority: (values.priority || null) as Priority };
                    }
                    return r;
                  }),
                };
              },
            },
          );
        }
        if (listChanged) {
          await mutate(moveToList({ reminderId: reminder.id, listId: values.listId }), {
            optimisticUpdate(data) {
              if (!data) return;

              return {
                ...data,
                reminders: data.reminders.map((r) => {
                  if (reminder.id === r.id) {
                    return {
                      ...r,
                      list: data.lists.find((l) => l.id === values.listId) || null,
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
