/**
 * Add Task command
 */

import { useState, useRef } from "react";
import {
  ActionPanel,
  Action,
  Form,
  showToast,
  Toast,
  Icon,
  useNavigation,
} from "@raycast/api";
import { addTask } from "./lib/api";
import { useAuth } from "./hooks/useAuth";
import { AuthenticatedView } from "./components/AuthenticatedView";
import TaskRefinement from "./components/TaskRefinement";

function AddTaskForm() {
  const [rawText, setRawText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const isSubmitting = useRef(false);
  const { push } = useNavigation();
  const { handleSignOut } = useAuth();

  async function handleSubmit() {
    // Prevent double submission with ref (sync check)
    if (isSubmitting.current) return;
    isSubmitting.current = true;

    if (!rawText.trim()) {
      isSubmitting.current = false;
      showToast({
        style: Toast.Style.Failure,
        title: "Task is empty",
        message: "Please enter a task description",
      });
      return;
    }

    setIsLoading(true);

    try {
      const task = await addTask(rawText);

      await showToast({
        style: Toast.Style.Success,
        title: "Task created",
        message: "Refine details or press Enter to save",
      });

      // Clear form and navigate to refinement view
      setRawText("");
      push(<TaskRefinement task={task} />);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to add task",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
      isSubmitting.current = false;
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Capture Task" onSubmit={handleSubmit} />
          <ActionPanel.Section title="Account">
            <Action
              title="Sign Out"
              icon={Icon.Logout}
              style={Action.Style.Destructive}
              onAction={handleSignOut}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="rawText"
        title="Quick Capture"
        placeholder="e.g., Finalize project proposal by Friday, 2 hours, high priority"
        value={rawText}
        onChange={setRawText}
        autoFocus
      />

      <Form.Description text="Brain-dump your task in plain English. Cleyo automatically extracts dates, projects, and priorities for you." />
    </Form>
  );
}

export default function AddTask() {
  return (
    <AuthenticatedView>
      <AddTaskForm />
    </AuthenticatedView>
  );
}
