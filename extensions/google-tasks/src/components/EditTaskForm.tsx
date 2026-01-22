import { Form, ActionPanel, Action, useNavigation, Icon, Toast, showToast } from "@raycast/api";
import { Task } from "../types";
import { useForm, FormValidation } from "@raycast/utils";

interface EditTaskFormValues {
  title: string;
  notes: string;
  due: Date | null;
}

export default function EditTaskForm(props: {
  listId: string;
  task: Task;
  onEdit: (listId: string, task: Task) => void;
}) {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<EditTaskFormValues>({
    async onSubmit(values) {
      try {
        await props.onEdit(props.listId, {
          ...props.task,
          title: values.title,
          notes: values.notes,
          due: values.due ? values.due.toISOString() : undefined,
        });
        showToast({
          style: Toast.Style.Success,
          title: "Task Updated!",
          message: `${values.title} updated`,
        });
        pop();
      } catch (error) {
        // Error handling is done in the parent component
        throw error;
      }
    },
    initialValues: {
      title: props.task.title,
      notes: props.task.notes || "",
      due: props.task.due ? new Date(props.task.due) : null,
    },
    validation: {
      title: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Edit Task" icon={Icon.Pencil} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Title" {...itemProps.title} />
      <Form.TextArea title="Details" {...itemProps.notes} />
      <Form.DatePicker title="Due Date" {...itemProps.due} />
    </Form>
  );
}
