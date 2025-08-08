import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { getTask as getTaskById } from "../api"; // <- re-use your existing function
import { focusTask } from "../components/task"; // You already have this!
import { Task } from "../api";

export default function FocusFromUrlCommand() {
  const [url, setUrl] = useState("");

  async function handleSubmit() {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Focusing task..." });

    // Grab the ID from the link
    const match = url.match(/(\d{6,})/);
    const id = match?.[1];

    if (!id) {
      toast.style = Toast.Style.Failure;
      toast.title = "Invalid URL";
      toast.message = "Make sure it's a real Todoist task link!";
      return;
    }

    try {
      const task: Task = await getTaskById(id);

      // Focus the task!
      await focusTask({
        id: task.id,
        content: task.content,
        labels: task.labels || [],
      });

      toast.style = Toast.Style.Success;
      toast.title = "Focused!";
      toast.message = task.content;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Couldn't find task";
      toast.message = String(error);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Focus Task" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="url"
        title="Paste Todoist Task URL"
        placeholder="https://todoist.com/app/task/123456789"
        value={url}
        onChange={setUrl}
      />
    </Form>
  );
}