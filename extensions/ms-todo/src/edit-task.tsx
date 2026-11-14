import {
  Action,
  ActionPanel,
  Form,
  Icon,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useRef, useState } from "react";
import { Task, TaskEdit, editTask } from "./cli";
import { graphDate } from "./task-display";

type Props = { task: Task; cliPath?: string; onSaved: () => void };

export function EditTask({ task, cliPath, onSaved }: Props) {
  const { pop } = useNavigation();
  const [title, setTitle] = useState(task.title);
  const [due, setDue] = useState("");
  const [importance, setImportance] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  async function save() {
    if (busyRef.current) return;
    if (!title.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Title cannot be empty",
      });
      return;
    }
    const change: TaskEdit = {};
    if (title !== task.title) change.title = title;
    if (due.trim()) change.due = due.trim();
    if (
      importance === "low" ||
      importance === "normal" ||
      importance === "high"
    )
      change.importance = importance;
    if (Object.keys(change).length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No changes to save",
      });
      return;
    }
    busyRef.current = true;
    setBusy(true);
    try {
      await editTask(task.id, change, cliPath);
      await showToast({
        style: Toast.Style.Success,
        title: "Task updated locally",
        message: "Sync may still be pending",
      });
      onSaved();
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not edit task",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  return (
    <Form
      isLoading={busy}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Task"
            icon={Icon.Check}
            onSubmit={save}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        value={title}
        onChange={setTitle}
      />
      <Form.TextField
        id="due"
        title="New Due Date"
        placeholder="tomorrow, fri, 2026-10-02, or - to clear"
        value={due}
        onChange={setDue}
      />
      <Form.Description
        text={`Current due date: ${graphDate(task.dueDateTime, true)}. Leave blank to keep it; enter - to clear.`}
      />
      <Form.Dropdown
        id="importance"
        title="New Importance"
        value={importance}
        onChange={setImportance}
      >
        <Form.Dropdown.Item
          value=""
          title={`Keep ${task.importance ?? "normal"}`}
        />
        <Form.Dropdown.Item value="high" title="High" />
        <Form.Dropdown.Item value="normal" title="Normal" />
        <Form.Dropdown.Item value="low" title="Low" />
      </Form.Dropdown>
      <Form.Description text="Notes are read-only here. Use the ms-todo CLI or TUI to edit rich notes without losing formatting." />
    </Form>
  );
}
