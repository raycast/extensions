import { ActionPanel, Action, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState } from "react";

import { Task, updateTask } from "../api";
import useCachedData from "../hooks/useCachedData";

type TaskEditProps = {
  task: Task;
};

export default function TaskEdit({ task }: TaskEditProps) {
  const { pop } = useNavigation();
  const [data, setData] = useCachedData();

  const [content, setContent] = useState(task.content);
  const [description, setDescription] = useState(task.description);

  async function submit() {
    await showToast({ style: Toast.Style.Animated, title: "Updating task" });

    try {
      await updateTask({ id: task.id, content, description }, { data, setData });
      await showToast({ style: Toast.Style.Success, title: "Task updated" });

      pop();
    } catch (error) {
      await showFailureToast(error, { title: "Unable to update task" });
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
        enableMarkdown
        id="description"
        title="Description"
        placeholder="Apples, pears, and **strawberries**"
        value={description}
        onChange={setDescription}
      />
    </Form>
  );
}
