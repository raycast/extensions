import {
  Action,
  ActionPanel,
  Form,
  showToast,
  Toast,
  getPreferenceValues,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { authorize } from "./oauth";
import { getTaskLists, createTask, TodoTaskList } from "./api";

interface Preferences {
  defaultList?: string;
}

export default function AddTask() {
  const [taskTitle, setTaskTitle] = useState("");
  const [isImportant, setIsImportant] = useState(false);
  const [lists, setLists] = useState<TodoTaskList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string>("");

  useEffect(() => {
    async function init() {
      try {
        const token = await authorize();
        setAccessToken(token);

        const taskLists = await getTaskLists(token);
        setLists(taskLists);

        const { defaultList } = getPreferenceValues<Preferences>();
        const defaultName = defaultList?.trim() || "Tasks";
        const match = taskLists.find(
          (l) => l.displayName.toLowerCase() === defaultName.toLowerCase(),
        );
        if (match) {
          setSelectedListId(match.id);
        } else if (taskLists.length > 0) {
          setSelectedListId(taskLists[0].id);
        }
      } catch (error) {
        console.error("Initialization error:", error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to connect",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  async function handleSubmit() {
    if (!taskTitle.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Task title is required",
      });
      return;
    }

    if (!selectedListId) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Please select a task list",
      });
      return;
    }

    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Creating task...",
      });
      await createTask(
        accessToken,
        selectedListId,
        taskTitle.trim(),
        isImportant,
      );
      const listName =
        lists.find((l) => l.id === selectedListId)?.displayName ?? "Unknown";
      await showToast({
        style: Toast.Style.Success,
        title: "Task created",
        message: `"${taskTitle.trim()}" added to ${listName}`,
      });
      setTaskTitle("");
      setIsImportant(false);
    } catch (error) {
      console.error("Create task error:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to create task",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Task" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="taskTitle"
        title="Task"
        placeholder="What do you need to do?"
        value={taskTitle}
        onChange={setTaskTitle}
      />
      <Form.Checkbox
        id="isImportant"
        label="Mark as Important"
        title="Important"
        value={isImportant}
        onChange={setIsImportant}
      />
      <Form.Dropdown
        id="listId"
        title="List"
        value={selectedListId}
        onChange={setSelectedListId}
      >
        {lists.map((list) => (
          <Form.Dropdown.Item
            key={list.id}
            value={list.id}
            title={list.displayName}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
