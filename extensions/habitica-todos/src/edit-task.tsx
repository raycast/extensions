import { Form, ActionPanel, Action, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { HabiticaTask, HabiticaTag, TaskAttribute, UpdateTaskBody } from "./types";
import { updateTask, getTags, addTagToTask, removeTagFromTask } from "./api";
import { toHabiticaDate, parseHabiticaDate } from "./date-utils";
import { PRIORITY_OPTIONS, ATTRIBUTE_OPTIONS } from "./constants";

interface EditTaskFormProps {
  task: HabiticaTask;
  onUpdated: () => void;
}

interface FormValues {
  text: string;
  notes: string;
  priority: string;
  attribute: string;
  date: Date | null;
  tags: string[];
}

export default function EditTaskForm({ task, onUpdated }: EditTaskFormProps) {
  const { pop } = useNavigation();
  const [tags, setTags] = useState<HabiticaTag[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState(true);

  useEffect(() => {
    getTags()
      .then(setTags)
      .catch((error) => showToast({ style: Toast.Style.Failure, title: "Failed to load tags", message: String(error) }))
      .finally(() => setIsLoadingTags(false));
  }, []);

  async function handleSubmit(values: FormValues) {
    if (!values.text.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Title is required" });
      return;
    }

    const body: UpdateTaskBody = { text: values.text.trim(), notes: values.notes.trim() };

    if (values.priority) body.priority = parseFloat(values.priority);
    if (values.attribute) body.attribute = values.attribute as TaskAttribute;

    if (task.type === "todo") {
      const dueDate = toHabiticaDate(values.date);
      if (dueDate) {
        body.date = dueDate;
      } else if (task.date) {
        body.date = "";
      }
    }

    await showToast({ style: Toast.Style.Animated, title: "Updating task…" });

    try {
      await updateTask(task.id, body);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update task",
        message: String(error),
      });
      return;
    }

    const desired = new Set(values.tags ?? []);
    const current = new Set(task.tags ?? []);
    const toAdd = [...desired].filter((id) => !current.has(id));
    const toRemove = [...current].filter((id) => !desired.has(id));

    try {
      await Promise.all([
        ...toAdd.map((id) => addTagToTask(task.id, id)),
        ...toRemove.map((id) => removeTagFromTask(task.id, id)),
      ]);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Task saved, but tag sync failed",
        message: String(error),
      });
      onUpdated();
      pop();
      return;
    }

    await showToast({ style: Toast.Style.Success, title: "Task updated!" });
    onUpdated();
    pop();
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

      <Form.Dropdown id="attribute" title="Attribute" defaultValue={task.attribute ?? "str"}>
        {ATTRIBUTE_OPTIONS.map((opt) => (
          <Form.Dropdown.Item key={opt.value} value={opt.value} title={opt.title} />
        ))}
      </Form.Dropdown>

      {task.type === "todo" && (
        <Form.DatePicker
          id="date"
          title="Due Date"
          type={Form.DatePicker.Type.Date}
          defaultValue={parseHabiticaDate(task.date) ?? undefined}
        />
      )}

      <Form.TagPicker
        id="tags"
        title="Tags"
        defaultValue={task.tags ?? []}
        placeholder={isLoadingTags ? "Loading tags…" : "Select tags"}
      >
        {tags.map((tag) => (
          <Form.TagPicker.Item key={tag.id} value={tag.id} title={tag.name} />
        ))}
      </Form.TagPicker>
    </Form>
  );
}
