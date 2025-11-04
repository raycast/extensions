import { ActionPanel, Action, Form, showToast, Toast, popToRoot, Icon } from "@raycast/api";
import { useState } from "react";
import { getClient } from "./api/client";
import { CreateTaskInput } from "./api/types";

export default function CreateTask() {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (values: {
    title: string;
    priority?: string;
    due?: Date;
    scheduled?: Date;
    tags?: string;
    projects?: string;
    contexts?: string;
    details?: string;
  }) => {
    if (!values.title || values.title.trim().length === 0) {
      showToast({
        style: Toast.Style.Failure,
        title: "Title Required",
        message: "Please enter a task title",
      });
      return;
    }

    setIsLoading(true);

    try {
      const client = getClient();

      // Check API health first
      try {
        await client.checkHealth();
      } catch {
        showToast({
          style: Toast.Style.Failure,
          title: "API Connection Failed",
          message: "Make sure TaskNotes API is running in Obsidian",
        });
        setIsLoading(false);
        return;
      }

      // Prepare task payload
      const task: CreateTaskInput = {
        title: values.title.trim(),
        status: "open",
      };

      if (values.priority && values.priority !== "none") {
        task.priority = values.priority;
      }

      if (values.due) {
        task.due = values.due.toISOString().split("T")[0];
      }

      if (values.scheduled) {
        task.scheduled = values.scheduled.toISOString().split("T")[0];
      }

      if (values.tags) {
        task.tags = values.tags
          .split(",")
          .map((t) => t.trim())
          .filter((t) => t.length > 0);
      }

      if (values.projects) {
        task.projects = values.projects
          .split(",")
          .map((p) => {
            const trimmed = p.trim();
            // Ensure project is wrapped in [[ ]]
            return trimmed.startsWith("[[") ? trimmed : `[[${trimmed}]]`;
          })
          .filter((p) => p.length > 4);
      }

      if (values.contexts) {
        task.contexts = values.contexts
          .split(",")
          .map((c) => {
            const trimmed = c.trim();
            // Ensure context starts with @
            return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
          })
          .filter((c) => c.length > 1);
      }

      if (values.details) {
        task.details = values.details;
      }

      const response = await client.createTask(task);

      if (response.success) {
        showToast({
          style: Toast.Style.Success,
          title: "Task Created",
          message: values.title,
        });
        popToRoot();
      } else {
        throw new Error(response.error || "Failed to create task");
      }
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to Create Task",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Task" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" placeholder="Task title" autoFocus />

      <Form.Dropdown id="priority" title="Priority" defaultValue="none">
        <Form.Dropdown.Item value="none" title="None" icon={Icon.Minus} />
        <Form.Dropdown.Item value="low" title="Low" icon={Icon.Circle} />
        <Form.Dropdown.Item value="normal" title="Normal" icon={Icon.Dot} />
        <Form.Dropdown.Item value="high" title="High" icon={Icon.Important} />
      </Form.Dropdown>

      <Form.DatePicker id="due" title="Due Date" type={Form.DatePicker.Type.Date} />

      <Form.DatePicker id="scheduled" title="Scheduled Date" type={Form.DatePicker.Type.Date} />

      <Form.TextField
        id="projects"
        title="Projects"
        placeholder="Project1, Project2"
        info="Comma-separated project names"
      />

      <Form.TextField id="tags" title="Tags" placeholder="tag1, tag2" info="Comma-separated tags (without #)" />

      <Form.TextField id="contexts" title="Contexts" placeholder="@home, @work" info="Comma-separated contexts" />

      <Form.TextArea id="details" title="Details" placeholder="Additional task details..." />
    </Form>
  );
}
