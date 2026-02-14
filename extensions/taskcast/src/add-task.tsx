import {
  Form,
  showToast,
  Toast,
  ActionPanel,
  Action,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { listTaskLists, createTask, type GoogleTaskList } from "./api/tasks";
import { applyPriority } from "./lib/priority";

type PrioritySelection = "none" | "high" | "medium" | "low";

export default function AddTask() {
  const { pop } = useNavigation();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<PrioritySelection>("none");
  const [due, setDue] = useState<Date | null>(null);
  const [lists, setLists] = useState<GoogleTaskList[]>([]);
  const [selectedList, setSelectedList] = useState<string>("");

  useEffect(() => {
    async function loadLists() {
      try {
        const response = await listTaskLists();
        const items = response.items || [];
        setLists(items);
        if (items.length > 0) {
          setSelectedList(items[0].id);
        }
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load task lists",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    loadLists();
  }, []);

  async function handleSubmit() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Task title is required",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (!selectedList) {
        throw new Error("No task list selected.");
      }

      let finalTitle = trimmedTitle;

      if (priority !== "none") {
        const prefix =
          priority === "high" ? "🔴 " : priority === "medium" ? "🟡 " : "🔵 ";

        finalTitle = prefix + trimmedTitle.replace(/^[🔴🟡🔵]\s*/u, "");
      } else {
        finalTitle = applyPriority(trimmedTitle);
      }

      await createTask(selectedList, finalTitle, due ?? undefined);

      await showToast({
        style: Toast.Style.Success,
        title: "Task created",
      });

      pop();
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to create task",
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle="New Task"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Task" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Task Title"
        placeholder="Pay electricity bill"
        value={title}
        onChange={setTitle}
      />

      <Form.DatePicker
        id="due"
        title="Due (optional)"
        value={due}
        onChange={setDue}
      />

      <Form.Dropdown
        id="priority"
        title="Priority"
        value={priority}
        onChange={(value) => setPriority(value as PrioritySelection)}
      >
        <Form.Dropdown.Item value="none" title="None" />
        <Form.Dropdown.Item value="high" title="High" />
        <Form.Dropdown.Item value="medium" title="Medium" />
        <Form.Dropdown.Item value="low" title="Low" />
      </Form.Dropdown>

      <Form.Dropdown
        id="list"
        title="List"
        value={selectedList}
        onChange={setSelectedList}
      >
        {lists.map((list) => (
          <Form.Dropdown.Item
            key={list.id}
            value={list.id}
            title={list.title}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
