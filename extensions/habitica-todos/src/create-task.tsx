import { Form, ActionPanel, Action, showToast, Toast, launchCommand, LaunchType, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { createTask, getTags } from "./api";
import { HabiticaTag, CreateTaskBody, TaskAttribute } from "./types";
import { toHabiticaDate } from "./date-utils";
import { PRIORITY_OPTIONS, ATTRIBUTE_OPTIONS } from "./constants";

interface FormValues {
  text: string;
  type: string;
  notes: string;
  priority: string;
  attribute: string;
  date: Date | null;
  tags: string[];
  checklist: string;
}

const TYPE_TO_COMMAND: Record<string, string> = {
  todo: "view-tasks",
  habit: "view-habits",
  daily: "view-dailies",
};

interface CreateTaskFormProps {
  defaultType?: CreateTaskBody["type"];
  onCreated?: () => void;
}

export function CreateTaskForm({ defaultType = "todo", onCreated }: CreateTaskFormProps) {
  const { pop } = useNavigation();
  const [tags, setTags] = useState<HabiticaTag[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState(true);
  const [type, setType] = useState<string>(defaultType);

  useEffect(() => {
    loadTags();
  }, []);

  async function loadTags() {
    try {
      const data = await getTags();
      setTags(data);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load tags",
        message: String(error),
      });
    } finally {
      setIsLoadingTags(false);
    }
  }

  async function handleSubmit(values: FormValues) {
    if (!values.text.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Title is required" });
      return;
    }

    const taskType = (values.type || "todo") as CreateTaskBody["type"];

    const body: CreateTaskBody = { text: values.text.trim(), type: taskType };

    if (values.notes?.trim()) body.notes = values.notes.trim();
    if (values.priority) body.priority = parseFloat(values.priority);
    if (values.attribute) body.attribute = values.attribute as TaskAttribute;

    if (taskType === "todo") {
      const dueDate = toHabiticaDate(values.date);
      if (dueDate) body.date = dueDate;
    }

    if (values.tags?.length > 0) body.tags = values.tags;

    if (values.checklist?.trim()) {
      const items = values.checklist
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((text) => ({ text }));
      if (items.length > 0) body.checklist = items;
    }

    try {
      await showToast({ style: Toast.Style.Animated, title: "Creating task…" });
      await createTask(body);
      await showToast({ style: Toast.Style.Success, title: "Task created!" });

      if (onCreated) {
        onCreated();
        pop();
      } else {
        const targetCommand = TYPE_TO_COMMAND[taskType] ?? "view-tasks";
        await launchCommand({ name: targetCommand, type: LaunchType.UserInitiated });
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to create task",
        message: String(error),
      });
    }
  }

  return (
    <Form
      navigationTitle="Create Habitica Task"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Task" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="text" title="Title" placeholder="What do you need to do?" autoFocus />

      <Form.Dropdown id="type" title="Type" value={type} onChange={setType}>
        <Form.Dropdown.Item value="todo" title="To-Do" />
        <Form.Dropdown.Item value="habit" title="Habit" />
        <Form.Dropdown.Item value="daily" title="Daily" />
      </Form.Dropdown>

      <Form.TextArea id="notes" title="Notes" placeholder="Additional details (optional)" />

      {(type === "todo" || type === "daily") && (
        <Form.TextArea
          id="checklist"
          title="Checklist"
          placeholder="One sub-task per line (optional)"
          info="Each line becomes a checklist item."
        />
      )}

      <Form.Separator />

      <Form.Dropdown id="priority" title="Difficulty" defaultValue="1">
        {PRIORITY_OPTIONS.map((opt) => (
          <Form.Dropdown.Item key={opt.value} value={opt.value} title={opt.title} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="attribute"
        title="Attribute"
        defaultValue="str"
        info="Stat this task trains. Auto-allocate uses this to distribute level-up points."
      >
        {ATTRIBUTE_OPTIONS.map((opt) => (
          <Form.Dropdown.Item key={opt.value} value={opt.value} title={opt.title} />
        ))}
      </Form.Dropdown>

      {type === "todo" && <Form.DatePicker id="date" title="Due Date" type={Form.DatePicker.Type.Date} />}

      <Form.Separator />

      <Form.TagPicker id="tags" title="Tags" placeholder={isLoadingTags ? "Loading tags…" : "Select tags"}>
        {tags.map((tag) => (
          <Form.TagPicker.Item key={tag.id} value={tag.id} title={tag.name} />
        ))}
      </Form.TagPicker>
    </Form>
  );
}

export default function Command() {
  return <CreateTaskForm />;
}
