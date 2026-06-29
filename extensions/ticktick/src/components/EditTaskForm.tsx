import { Form, ActionPanel, Action, showToast, Toast, useNavigation } from "@raycast/api";
import { useSync } from "../hooks/useSync";
import { updateTask, formatDueDateForApi } from "../api/tasks";
import { Task } from "../types/ticktick";
import { parseISO, isValid } from "date-fns";

interface Props {
  task: Task;
  onSave: () => void;
}

export function EditTaskForm({ task, onSave }: Props) {
  const { pop } = useNavigation();
  const { data } = useSync();
  const projects = data.projects.filter((p) => !p.closed);

  async function handleSubmit(values: {
    title: string;
    content: string;
    projectId: string;
    priority: string;
    dueDate?: Date | null;
    tags: string;
  }) {
    if (!values.title.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Title is required" });
      return;
    }
    try {
      const tags = values.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      await updateTask({
        id: task.id,
        projectId: values.projectId || task.projectId,
        title: values.title.trim(),
        content: values.content?.trim() || undefined,
        priority: (parseInt(values.priority, 10) as 0 | 1 | 3 | 5) || 0,
        tags: tags.length > 0 ? tags : undefined,
        ...(values.dueDate && { dueDate: formatDueDateForApi(values.dueDate), isAllDay: true }),
      });
      await showToast({ style: Toast.Style.Success, title: "Task updated" });
      onSave();
      pop();
    } catch (err) {
      await showToast({ style: Toast.Style.Failure, title: "Failed to update", message: String(err) });
    }
  }

  let defaultDue: Date | undefined;
  if (task.dueDate) {
    const parsed = parseISO(task.dueDate);
    if (isValid(parsed)) defaultDue = parsed;
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" defaultValue={task.title} />
      <Form.TextArea id="content" title="Notes" defaultValue={task.content ?? ""} />
      <Form.Dropdown id="projectId" title="Project" defaultValue={task.projectId}>
        {projects.map((p) => (
          <Form.Dropdown.Item key={p.id} value={p.id} title={p.name} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="priority" title="Priority" defaultValue={String(task.priority)}>
        <Form.Dropdown.Item value="0" title="None" />
        <Form.Dropdown.Item value="1" title="Low" />
        <Form.Dropdown.Item value="3" title="Medium" />
        <Form.Dropdown.Item value="5" title="High" />
      </Form.Dropdown>
      <Form.DatePicker id="dueDate" title="Due Date" type={Form.DatePicker.Type.Date} defaultValue={defaultDue} />
      <Form.TextField
        id="tags"
        title="Tags"
        placeholder="work, urgent (comma-separated)"
        defaultValue={task.tags?.join(", ") ?? ""}
      />
    </Form>
  );
}
