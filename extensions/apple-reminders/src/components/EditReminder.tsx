import { ActionPanel, Action, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, MutatePromise, useForm } from "@raycast/utils";
import { setTitleAndNotes } from "swift:../../swift/AppleReminders";

import { List, Reminder } from "../hooks/useData";

type EditReminderProps = {
  reminder: Reminder;
  mutate: MutatePromise<{ reminders: Reminder[]; lists: List[] } | undefined>;
};

export default function EditReminder({ reminder, mutate }: EditReminderProps) {
  const { pop } = useNavigation();

  const { itemProps, handleSubmit } = useForm<{ title: string; notes: string }>({
    async onSubmit(values) {
      try {
        await mutate(setTitleAndNotes({ reminderId: reminder.id, title: values.title, notes: values.notes }), {
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
        });

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
    </Form>
  );
}
