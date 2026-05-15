import {
  Form,
  ActionPanel,
  Action,
  Icon,
  Toast,
  showToast,
  popToRoot,
} from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { useState, useEffect } from "react";
import { google } from "./oauth";
import { fetchTaskLists, createTask } from "./api";
import { TaskList } from "./types";

function CreateTask() {
  const [lists, setLists] = useState<TaskList[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const fetched = await fetchTaskLists();
        setLists(fetched);
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load task lists",
          message: String(error),
        });
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  async function handleSubmit(values: {
    title: string;
    notes: string;
    due: Date | null;
    listId: string;
  }) {
    if (!values.title.trim()) {
      showToast({ style: Toast.Style.Failure, title: "Title is required" });
      return;
    }

    try {
      await createTask(values.listId, {
        title: values.title,
        notes: values.notes || undefined,
        due: values.due,
      });
      showToast({
        style: Toast.Style.Success,
        title: "Task created",
        message: values.title,
      });
      popToRoot();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to create task",
        message: String(error),
      });
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Task"
            icon={Icon.Plus}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" placeholder="Task title" />
      <Form.TextArea id="notes" title="Notes" placeholder="Optional notes..." />
      <Form.DatePicker id="due" title="Due Date" />
      <Form.Dropdown id="listId" title="Task List" defaultValue={lists[0]?.id}>
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

export default withAccessToken(google)(CreateTask);
