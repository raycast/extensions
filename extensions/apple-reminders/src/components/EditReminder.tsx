import { ActionPanel, Action, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, MutatePromise, useForm } from "@raycast/utils";
import { setTitleAndNotes, moveToList } from "swift:../../swift/AppleReminders";

import { List, Reminder, useData } from "../hooks/useData";

type EditReminderProps = {
  reminder: Reminder;
  mutate: MutatePromise<{ reminders: Reminder[]; lists: List[] } | undefined>;
};

export default function EditReminder({ reminder, mutate }: EditReminderProps) {
  const { pop } = useNavigation();
  const { data } = useData();
  const lists = data?.lists || [];

  const { itemProps, handleSubmit } = useForm<{ title: string; notes: string; listId: string }>({
    async onSubmit(values) {
      try {
        const titleOrNotesChanged = values.title !== reminder.title || values.notes !== reminder.notes;
        const listChanged = values.listId !== (reminder.list?.id || "");

        titleOrNotesChanged &&
          (await mutate(setTitleAndNotes({ reminderId: reminder.id, title: values.title, notes: values.notes }), {
            optimisticUpdate(data) {
              if (!data) return;

              return {
                ...data,
                reminders: data.reminders.map((r) => {
                  if (reminder.id === r.id) {
                    return { ...r, title: values.title, notes: values.notes };
                  }
                  return r;
                }),
              };
            },
          }));
        listChanged &&
          (await mutate(moveToList({ reminderId: reminder.id, listId: values.listId }), {
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
          }));

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
      notes: reminder.notes,
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
