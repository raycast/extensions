import { Form, ActionPanel, Action, showToast, Toast, useNavigation } from "@raycast/api";
import { HabiticaTask, updateTask, UpdateTaskBody } from "./api";

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
      await showToast({
        style: Toast.Style.Failure,
        title: "Title is required",
      });
      return;
    }

    const body: UpdateTaskBody = {
      text: values.text.trim(),
    };

    if (values.notes !== undefined) {
      body.notes = values.notes.trim();
    }

    if (values.priority) {
      body.priority = parseFloat(values.priority);
    }

    if (values.date) {
      body.date = values.date.toISOString().split("T")[0];
    } else if (task.date) {
      // Explicitly clear the date if the user removed it
      body.date = "";
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

      <Form.TextArea id="notes" title="Notes" defaultValue={task.notes || ""} />

      <Form.Separator />

      <Form.Dropdown id="priority" title="Difficulty" defaultValue={String(task.priority)}>
        <Form.Dropdown.Item value="0.1" title="Trivial" />
        <Form.Dropdown.Item value="1" title="Easy" />
        <Form.Dropdown.Item value="1.5" title="Medium" />
        <Form.Dropdown.Item value="2" title="Hard" />
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
