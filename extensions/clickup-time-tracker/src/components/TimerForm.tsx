import {
  Action,
  ActionPanel,
  Form,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { startTimeEntry } from "../api/clickup";
import { Task } from "../types/clickup";

interface TimerFormProps {
  task: Task;
  onTimerStarted?: () => void;
}

export function TimerForm({ task, onTimerStarted }: TimerFormProps) {
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { pop } = useNavigation();

  async function handleSubmit() {
    setIsLoading(true);

    try {
      await startTimeEntry(task.id, description);

      await showToast({
        style: Toast.Style.Success,
        title: "Timer Started",
        message: `Tracking time on "${task.name}"`,
      });

      onTimerStarted?.();
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Start Timer",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
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
          <Action.SubmitForm title="Start Timer" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Task" text={task.name} />
      <Form.Description title="List" text={task.list.name} />
      <Form.Description title="Status" text={task.status.status} />
      <Form.Separator />
      <Form.TextArea
        id="description"
        title="Description"
        placeholder="What are you working on?"
        value={description}
        onChange={setDescription}
      />
    </Form>
  );
}
