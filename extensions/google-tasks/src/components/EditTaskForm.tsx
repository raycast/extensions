import { Form, ActionPanel, Action, useNavigation } from "@raycast/api";
import { useCallback } from "react";
import { editTask } from "../api/endpoints";
import { TaskForm } from "../types";

export default function EditTaskForm(props: {
  listId: string;
  task: TaskForm;
}) {
  const { pop } = useNavigation();

  const handleSubmit = useCallback(
    (values: { title: string; notes: string; due: string }) => {
      editTask(props.listId, {
        title: values.title,
        notes: values.notes,
        due: values.due,
      });
      pop();
    },
    [editTask, pop]
  );

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Edit Task" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        defaultValue={props.task.title}
      />
      <Form.TextArea
        id="notes"
        title="Details"
        defaultValue={props.task.notes}
      />
      <Form.DatePicker
        id="due"
        title="Due Date"
        defaultValue={
          props.task.due === undefined ? undefined : new Date(props.task.due)
        }
      />
    </Form>
  );
}
