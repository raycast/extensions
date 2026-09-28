import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { useState } from "react";
import { isoDuration, systemTimeZone, toLocalDateTime } from "./lib/dates";
import { createTask } from "./lib/morgen";
import { showFailure, showSuccess } from "./lib/ui";

interface Values {
  title: string;
  description: string;
  due?: Date;
  duration: string;
  priority: string;
}

export default function CreateTask() {
  const [submitting, setSubmitting] = useState(false);
  const { pop } = useNavigation();

  async function submit(values: Values) {
    if (!values.title.trim()) {
      await showFailure(new Error("Enter a task title."));
      return;
    }
    setSubmitting(true);
    try {
      await createTask({
        title: values.title.trim(),
        description: values.description.trim() || undefined,
        ...(values.due
          ? {
              due: toLocalDateTime(values.due, systemTimeZone()),
              timeZone: systemTimeZone(),
            }
          : {}),
        ...(values.duration !== "none"
          ? { estimatedDuration: isoDuration(Number(values.duration)) }
          : {}),
        priority: Number(values.priority),
      });
      await showSuccess("Task created");
      pop();
    } catch (error) {
      await showFailure(error);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={submitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Task"
            icon={Icon.CheckCircle}
            onSubmit={submit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        placeholder="Review proposal"
        autoFocus
      />
      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Optional details"
      />
      <Form.DatePicker id="due" title="Due" />
      <Form.Dropdown id="duration" title="Estimated Time" defaultValue="none">
        <Form.Dropdown.Item value="none" title="None" />
        {[15, 30, 60, 90, 120, 180, 240].map((minutes) => (
          <Form.Dropdown.Item
            key={minutes}
            value={String(minutes)}
            title={`${minutes} minutes`}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="priority" title="Priority" defaultValue="0">
        <Form.Dropdown.Item value="0" title="None" />
        <Form.Dropdown.Item value="1" title="Highest" />
        <Form.Dropdown.Item value="3" title="High" />
        <Form.Dropdown.Item value="5" title="Medium" />
        <Form.Dropdown.Item value="7" title="Low" />
        <Form.Dropdown.Item value="9" title="Lowest" />
      </Form.Dropdown>
      <Form.Description text="Creates a native Morgen task. Connected third-party task providers are not available through this API." />
    </Form>
  );
}
