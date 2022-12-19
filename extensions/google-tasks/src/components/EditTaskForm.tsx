import { Form, ActionPanel, Action, useNavigation, Icon } from "@raycast/api";
import { useCallback } from "react";
import { Task } from "../types";

export default function EditTaskForm(props: {
  listId: string;
  task: Task;
  onEdit: (listId: string, task: Task) => void;
}) {
  const { pop } = useNavigation();

  const handleSubmit = useCallback(
    (values: { title: string; notes: string; due: string }) => {
      props.onEdit(props.listId, {
        ...props.task,
        title: values.title,
        notes: values.notes,
        due: values.due,
      });
      pop();
    },
    [props.onEdit, pop]
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
        defaultValue={props.task.due === undefined ? undefined : new Date(props.task.due)}
      />
    </Form>
  );
}
