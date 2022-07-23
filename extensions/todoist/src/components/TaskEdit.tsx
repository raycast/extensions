import { useState } from "react";
import { ActionPanel, Action, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { Task } from "@doist/todoist-api-typescript";
import { mutate } from "swr";
import { todoist, handleError } from "../api";
import { SWRKeys } from "../types";

interface TaskEditProps {
  task: Task;
}

export default function TaskEdit({ task }: TaskEditProps) {
  const { pop } = useNavigation();

  const [content, setContent] = useState(task.content);
  const [description, setDescription] = useState(task.description);

  async function submit() {
    await showToast({ style: Toast.Style.Animated, title: "Updating task" });

    try {
      await todoist.updateTask(task.id, { content, description });
      await showToast({ style: Toast.Style.Success, title: "Task updated" });
      mutate(SWRKeys.tasks);

      mutate([SWRKeys.task, task.id]);
      pop();
    } catch (error) {
      handleError({ error, title: "Unable to update task" });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Edit Task" onSubmit={submit} icon={Icon.Pencil} />
        </ActionPanel>
      }
    >
      <Form.TextField id="content" title="Title" placeholder="Buy fruits" value={content} onChange={setContent} />

      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Apples, pears, and **strawberries**"
        value={description}
        onChange={setDescription}
      />
    </Form>
  );
}
