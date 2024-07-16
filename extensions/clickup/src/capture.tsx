import { Form, ActionPanel, Action, showToast, Toast, popToRoot } from "@raycast/api";
import { useState } from "react";
import { ClickUpClient } from "./utils/clickUpClient";
import { TaskItem } from "./types/tasks.dt";
import preferences from "./utils/preferences";

interface FormValues {
  name: string;
  description: string;
  dueDate: string;
  priority: number;
}

export default function QuickCapture() {
  // Error message for the primary TextArea
  const [textErrorMessage, setTextErrorMessage] = useState<string | undefined>();

  // Clear the text error message
  const clearTextErrorMessage = () => setTextErrorMessage(undefined);

  const handleSubmit = async (formValues: FormValues) => {
    if (!formValues.name) {
      return setTextErrorMessage("Required");
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Creating task...",
    });

    try {
      const res = await ClickUpClient<TaskItem>(`/list/${preferences.listId}/task`, "POST", {
        name: formValues.name,
        ...(formValues?.description && { description: formValues.description }),
        ...(formValues?.dueDate && { due_date: new Date(formValues.dueDate).getTime() }),
        ...(formValues?.priority && { priority: formValues.priority }),
      });

      // Ensure the user sees root search when they re-open Raycast.
      if (res.status != 200) {
        throw new Error(`Failed to fetch with status code: ${res.status}`);
      }

      toast.style = Toast.Style.Success;
      toast.title = "Task created successfully";

      popToRoot();
    } catch (error) {
      console.log(error);
      showToast({ title: "Something went wrong", message: "Please try again", style: Toast.Style.Failure });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        placeholder="Buy toothpaste..."
        error={textErrorMessage}
        onChange={clearTextErrorMessage}
      />
      <Form.Separator />
      <Form.TextArea id="description" placeholder="Description" />
      <Form.DatePicker title="Due Date" id="dueDate" />
      <Form.Dropdown id="priority" title="Priority" defaultValue="3">
        <Form.Dropdown.Item value="1" title="Urgent" icon="🔴" />
        <Form.Dropdown.Item value="2" title="High" icon="🟠" />
        <Form.Dropdown.Item value="3" title="Normal" icon="🟡" />
        <Form.Dropdown.Item value="4" title="Low" icon="🟢" />
      </Form.Dropdown>
    </Form>
  );
}
