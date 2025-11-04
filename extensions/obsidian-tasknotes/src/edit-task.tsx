import { ActionPanel, Action, Form, showToast, Toast, useNavigation, Icon } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState } from "react";
import { getClient } from "./api/client";
import { Task, UpdateTaskInput } from "./api/types";
import { getTaskId } from "./utils/formatters";

/**
 * Parse a YYYY-MM-DD date string as a local date (not UTC)
 * This prevents timezone offset issues where "2025-10-29" would be parsed as UTC
 * and display as the previous day in negative UTC offset timezones
 */
function parseDateAsLocal(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

interface EditTaskFormProps {
  task: Task;
  onSave: () => void;
}

export default function EditTaskForm({ task, onSave }: EditTaskFormProps) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (values: {
    title: string;
    priority?: string;
    status?: string;
    due?: Date;
    scheduled?: Date;
    tags?: string;
    projects?: string;
    contexts?: string;
    details?: string;
  }) => {
    setIsLoading(true);

    try {
      const client = getClient();

      // Prepare update payload
      const updates: UpdateTaskInput = {
        title: values.title,
      };

      if (values.priority && values.priority !== "none") {
        updates.priority = values.priority;
      }

      // Always include status in updates to allow explicitly setting it back to 'open'
      if (values.status) {
        updates.status = values.status;
      }

      if (values.due) {
        updates.due = values.due.toISOString().split("T")[0];
      }

      if (values.scheduled) {
        updates.scheduled = values.scheduled.toISOString().split("T")[0];
      }

      if (values.tags) {
        updates.tags = values.tags
          .split(",")
          .map((t) => t.trim())
          .filter((t) => t.length > 0);
      }

      if (values.projects) {
        updates.projects = values.projects
          .split(",")
          .map((p) => {
            const trimmed = p.trim();
            // Ensure project is wrapped in [[ ]]
            return trimmed.startsWith("[[") ? trimmed : `[[${trimmed}]]`;
          })
          .filter((p) => p.length > 4);
      }

      if (values.contexts) {
        updates.contexts = values.contexts
          .split(",")
          .map((c) => {
            const trimmed = c.trim();
            // Ensure context starts with @
            return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
          })
          .filter((c) => c.length > 1);
      }

      if (values.details) {
        updates.details = values.details;
      }

      const response = await client.updateTask(getTaskId(task), updates);

      if (response.success) {
        showToast({
          style: Toast.Style.Success,
          title: "Task Updated",
        });
        onSave();
        pop();
      } else {
        throw new Error(response.error || "Failed to update task");
      }
    } catch (error) {
      showFailureToast(error, {
        title: "Failed to Update Task",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Convert date strings to Date objects for the form
  // Parse as local dates to avoid timezone offset issues
  const dueDate = task.due ? parseDateAsLocal(task.due) : undefined;
  const scheduledDate = task.scheduled ? parseDateAsLocal(task.scheduled) : undefined;

  // Format tags, projects, contexts for editing
  const tagsString = task.tags?.join(", ") || "";
  const projectsString = task.projects?.map((p) => p.replace(/\[\[|\]\]/g, "")).join(", ") || "";
  const contextsString = task.contexts?.join(", ") || "";

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Task" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" placeholder="Task title" defaultValue={task.title} />

      <Form.Dropdown id="priority" title="Priority" defaultValue={task.priority?.toLowerCase() || "none"}>
        <Form.Dropdown.Item value="none" title="None" icon={Icon.Minus} />
        <Form.Dropdown.Item value="low" title="Low" icon={Icon.Circle} />
        <Form.Dropdown.Item value="normal" title="Normal" icon={Icon.Dot} />
        <Form.Dropdown.Item value="high" title="High" icon={Icon.Important} />
      </Form.Dropdown>

      <Form.Dropdown id="status" title="Status" defaultValue={task.status || "open"}>
        <Form.Dropdown.Item value="none" title="None" icon={Icon.Minus} />
        <Form.Dropdown.Item value="open" title="Open" icon={Icon.Circle} />
        <Form.Dropdown.Item value="in-progress" title="In Progress" icon={Icon.Clock} />
        <Form.Dropdown.Item value="done" title="Done" icon={Icon.CheckCircle} />
        <Form.Dropdown.Item value="holding" title="Holding" icon={Icon.Pause} />
      </Form.Dropdown>

      <Form.DatePicker id="due" title="Due Date" defaultValue={dueDate} />

      <Form.DatePicker id="scheduled" title="Scheduled Date" defaultValue={scheduledDate} />

      <Form.TextField
        id="projects"
        title="Projects"
        placeholder="Project1, Project2"
        defaultValue={projectsString}
        info="Comma-separated project names"
      />

      <Form.TextField
        id="tags"
        title="Tags"
        placeholder="tag1, tag2"
        defaultValue={tagsString}
        info="Comma-separated tags (without #)"
      />

      <Form.TextField
        id="contexts"
        title="Contexts"
        placeholder="@home, @work"
        defaultValue={contextsString}
        info="Comma-separated contexts"
      />

      <Form.TextArea
        id="details"
        title="Details"
        placeholder="Additional task details..."
        defaultValue={task.details || ""}
      />
    </Form>
  );
}
