import { Form, ActionPanel, Action, showToast, Toast, launchCommand, LaunchType } from "@raycast/api";
import { useEffect, useState } from "react";
import { createTask, getTags, CreateTaskBody, HabiticaTag } from "./api";

interface FormValues {
  text: string;
  notes: string;
  priority: string;
  date: Date | null;
  tags: string[];
}

export default function Command() {
  const [tags, setTags] = useState<HabiticaTag[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await getTags();
        setTags(data);
      } catch {
        // silently fail – tags are optional
      } finally {
        setIsLoadingTags(false);
      }
    })();
  }, []);

  async function handleSubmit(values: FormValues) {
    if (!values.text.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Title is required",
      });
      return;
    }

    const body: CreateTaskBody = {
      text: values.text.trim(),
      type: "todo",
    };

    if (values.notes?.trim()) {
      body.notes = values.notes.trim();
    }

    if (values.priority) {
      body.priority = parseFloat(values.priority);
    }

    if (values.date) {
      body.date = values.date.toISOString().split("T")[0];
    }

    if (values.tags && values.tags.length > 0) {
      body.tags = values.tags;
    }

    try {
      await showToast({ style: Toast.Style.Animated, title: "Creating task…" });
      await createTask(body);
      await showToast({ style: Toast.Style.Success, title: "Task created!" });
      await launchCommand({
        name: "view-tasks",
        type: LaunchType.UserInitiated,
      });
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
      <Form.TextArea id="notes" title="Notes" placeholder="Additional details (optional)" />

      <Form.Separator />

      <Form.Dropdown id="priority" title="Difficulty" defaultValue="1">
        <Form.Dropdown.Item value="0.1" title="Trivial" />
        <Form.Dropdown.Item value="1" title="Easy" />
        <Form.Dropdown.Item value="1.5" title="Medium" />
        <Form.Dropdown.Item value="2" title="Hard" />
      </Form.Dropdown>

      <Form.DatePicker id="date" title="Due Date" type={Form.DatePicker.Type.Date} />

      <Form.Separator />

      <Form.TagPicker id="tags" title="Tags" placeholder={isLoadingTags ? "Loading tags…" : "Select tags"}>
        {tags.map((tag) => (
          <Form.TagPicker.Item key={tag.id} value={tag.id} title={tag.name} />
        ))}
      </Form.TagPicker>
    </Form>
  );
}
