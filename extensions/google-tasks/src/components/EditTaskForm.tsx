import { Form, ActionPanel, Action, useNavigation, Icon } from "@raycast/api";
import { useCallback } from "react";
import { EditableTask, Task } from "../types";
import { dueDay } from "../utils";

export default function EditTaskForm(props: {
  listId: string;
  task: Task;
  onEdit: (listId: string, task: EditableTask) => void;
}) {
  const { pop } = useNavigation();

  const due = dueDay(props.task.due);

  const handleSubmit = useCallback(
    (values: { title: string; notes: string; due: Date | null }) => {
      props.onEdit(props.listId, {
        ...props.task,
        title: values.title,
        notes: values.notes,
        due: values.due,
      });
      pop();
    },
    [props.listId, props.onEdit, props.task, pop],
  );

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Edit Task" icon={Icon.Pencil} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" defaultValue={props.task.title} />
      <Form.TextArea id="notes" title="Details" defaultValue={props.task.notes} />
      <Form.DatePicker
        id="due"
        title="Due Date"
        type={Form.DatePicker.Type.Date}
        defaultValue={due ? new Date(`${due}T00:00:00`) : undefined}
      />
    </Form>
  );
}
