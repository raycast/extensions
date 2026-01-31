import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  popToRoot,
} from "@raycast/api";
import { useState } from "react";
import { createTask } from "./api/client";

interface FormValues {
  title: string;
}

export default function QuickAdd() {
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(values: FormValues) {
    if (!values.title.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Title is required",
      });
      return;
    }

    setIsLoading(true);

    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Creating task...",
      });

      const task = await createTask({ title: values.title.trim() });

      await showToast({
        style: Toast.Style.Success,
        title: "Task created",
        message: task.title,
      });

      await popToRoot();
    } catch (error) {
      const message =
        error && typeof error === "object" && "message" in error
          ? (error as { message: string }).message
          : "Failed to create task";

      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: message,
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Task" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Task"
        placeholder="What needs to be done?"
        autoFocus
      />
    </Form>
  );
}
