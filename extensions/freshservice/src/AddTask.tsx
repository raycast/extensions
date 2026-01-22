import {
  Action,
  ActionPanel,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { createTask } from "./utils/freshservice";
import { isAxiosError } from "axios";

interface AddTaskProps {
  ticketId: number;
  onTaskAdded?: () => void;
}

interface TaskFormValues {
  title: string;
  description: string;
  due_date: Date | null;
}

export default function AddTask({ ticketId, onTaskAdded }: AddTaskProps) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(values: TaskFormValues) {
    setIsLoading(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Creating task...",
    });

    try {
      await createTask(ticketId, {
        title: values.title,
        description: values.description,
        due_date: values.due_date ? values.due_date.toISOString() : undefined,
        status: 1, // Open
        notify_before: 0,
      });
      toast.style = Toast.Style.Success;
      toast.title = "Task created";
      if (onTaskAdded) onTaskAdded();
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to create task";
      if (isAxiosError(error)) {
        toast.message = error.response?.data?.message || error.message;
      } else if (error instanceof Error) {
        toast.message = error.message;
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Task"
            onSubmit={handleSubmit}
            icon={Icon.Check}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        placeholder="Task title"
        autoFocus
      />
      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Task description"
        enableMarkdown
      />
      <Form.DatePicker id="due_date" title="Due Date" />
    </Form>
  );
}
