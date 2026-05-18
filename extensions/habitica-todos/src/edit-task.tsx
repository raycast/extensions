import { Form, ActionPanel, Action, showToast, Toast, useNavigation } from "@raycast/api";
import { HabiticaTask, UpdateTaskBody } from "./types";
import { updateTask } from "./api";
import { toHabiticaDate } from "./date-utils";
import { PRIORITY_OPTIONS } from "./constants";

interface EditTaskFormProps {
  task: HabiticaTask;
  onUpdated: () => void;
}

interface FormValues {
  text: string;
  notes: string;
  priority: string;
  date: Date | null;
}

export default function EditTaskForm({ task, onUpdated }: EditTaskFormProps) {
  const { pop } = useNavigation();

  async function handleSubmit(values: FormValues) {
    if (!values.text.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Title is required" });
      return;
    }

    const body: UpdateTaskBody = { text: values.text.trim(), notes: values.notes.trim() };

    if (values.priority) body.priority = parseFloat(values.priority);

    // Only apply date changes for task types that expose the DatePicker
    if (task.type === "todo") {
      const dueDate = toHabiticaDate(values.date);
      if (dueDate) {
        body.date = dueDate;
      } else if (task.date) {
        // Explicitly clear the date if the user removed it
        body.date = "";
      }
    }

    try {
      await showToast({ style: Toast.Style.Animated, title: "Updating task…" });
      await updateTask(task.id, body);
      await showToast({ style: Toast.Style.Success, title: "Task updated!" });
      onUpdated();
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update task",
        message: String(error),
      });
    }
  }

  return (
    <Form
      navigationTitle={`Edit: ${task.text}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Task" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="text" title="Title" defaultValue={task.text} autoFocus />

      <Form.TextArea id="notes" title="Notes" defaultValue={task.notes ?? ""} />

      <Form.Separator />

      <Form.Dropdown id="priority" title="Difficulty" defaultValue={String(task.priority)}>
        {PRIORITY_OPTIONS.map((opt) => (
          <Form.Dropdown.Item key={opt.value} value={opt.value} title={opt.title} />
        ))}
      </Form.Dropdown>

      {task.type === "todo" && (
        <Form.DatePicker
          id="date"
          title="Due Date"
          type={Form.DatePicker.Type.Date}
          defaultValue={task.date ? new Date(task.date) : undefined}
        />
      )}
    </Form>
  );
}
