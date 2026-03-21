import { Form, ActionPanel, Action, showToast, Toast, Icon, useNavigation } from "@raycast/api";
import { useState } from "react";
import { runBacklog } from "./backlog";

interface TaskData {
  id: string;
  title: string;
  status: string;
  priority: string;
  labels: string[];
  assignee: string;
  description: string;
  notes: string;
}

const PRIORITIES = [
  { title: "None", value: "" },
  { title: "High", value: "high" },
  { title: "Medium", value: "medium" },
  { title: "Low", value: "low" },
];

const STATUSES = [
  { title: "To Do", value: "to do" },
  { title: "In Progress", value: "in progress" },
  { title: "Done", value: "done" },
  { title: "Blocked", value: "blocked" },
];

export default function EditTask({
  task,
  projectDir,
  onComplete,
}: {
  task: TaskData;
  projectDir: string;
  onComplete?: () => void;
}) {
  const { pop } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(values: Record<string, string>) {
    setIsSubmitting(true);
    const args: string[] = ["task", "edit", task.id];

    const title = values.title?.trim();
    if (title && title !== task.title) {
      args.push("--title", title);
    }

    const status = values.status;
    if (status && status !== task.status.toLowerCase()) {
      args.push("--status", status);
    }

    const priority = values.priority;
    if (priority !== task.priority) {
      args.push("--priority", priority || "low");
    }

    const assignee = values.assignee?.trim();
    if (assignee !== (task.assignee || "")) {
      args.push("--assignee", assignee || "");
    }

    const labels = values.labels?.trim();
    const currentLabels = task.labels.join(", ");
    if (labels !== currentLabels) {
      args.push("--label", labels || "");
    }

    const description = values.description?.trim();
    if (description !== (task.description || "")) {
      args.push("--description", description || "");
    }

    const notes = values.notes?.trim();
    if (notes && notes !== (task.notes || "")) {
      args.push("--notes", notes);
    }

    // Only submit if there are actual changes
    if (args.length <= 3) {
      showToast({ style: Toast.Style.Success, title: "No changes to save" });
      setIsSubmitting(false);
      return;
    }

    args.push("--plain");

    try {
      await showToast({ style: Toast.Style.Animated, title: "Updating task..." });
      await runBacklog(args, projectDir);
      await showToast({ style: Toast.Style.Success, title: "Task updated", message: task.id });
      onComplete?.();
      pop();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await showToast({ style: Toast.Style.Failure, title: "Failed to update task", message: message.split("\n")[0] });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle={`Edit ${task.id}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" defaultValue={task.title} />
      <Form.TextArea id="description" title="Description" defaultValue={task.description} />
      <Form.Separator />
      <Form.Dropdown id="status" title="Status" defaultValue={task.status.toLowerCase()}>
        {STATUSES.map((s) => (
          <Form.Dropdown.Item key={s.value} title={s.title} value={s.value} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="priority" title="Priority" defaultValue={task.priority}>
        {PRIORITIES.map((p) => (
          <Form.Dropdown.Item key={p.value} title={p.title} value={p.value} />
        ))}
      </Form.Dropdown>
      <Form.TextField id="labels" title="Labels" defaultValue={task.labels.join(", ")} />
      <Form.TextField id="assignee" title="Assignee" defaultValue={task.assignee} />
      <Form.Separator />
      <Form.TextArea id="notes" title="Notes" defaultValue={task.notes} info="Replaces existing notes" />
    </Form>
  );
}
