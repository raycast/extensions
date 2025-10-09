import { Form, ActionPanel, Action, showToast, Toast, popToRoot, Icon } from "@raycast/api";
import { useState } from "react";
import { format } from "date-fns";
import { addTask } from "./utils";

export default function Command() {
  const [taskText, setTaskText] = useState("");

  async function handleSubmit(values: { task: string }) {
    if (!values.task?.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Task is required",
      });
      return;
    }

    try {
      const today = format(new Date(), "yyyy-MM-dd");
      await addTask(today, values.task.trim());
      await showToast({
        style: Toast.Style.Success,
        title: "Task Logged!",
        message: values.task,
      });
      popToRoot({ clearSearchBar: true });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to log task",
        message: String(error),
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Log Task" icon={Icon.Checkmark} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="What task did you just complete? 🎉" />
      <Form.TextArea
        id="task"
        title="Task"
        placeholder="e.g., Deployed the new feature to production"
        value={taskText}
        onChange={setTaskText}
      />
      <Form.Description text={`Logging for: ${format(new Date(), "EEEE, MMMM d, yyyy")}`} />
    </Form>
  );
}
