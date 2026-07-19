import {
  Action,
  ActionPanel,
  Form,
  List,
  Toast,
  popToRoot,
  showToast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { api, workspaceId } from "./api";

type Task = {
  type: "task";
  id: string;
  title: string;
  description?: string;
  identifier: string;
  status: string;
  priority: string;
  assigneeId?: string;
  projectId?: string;
  labelIds: string[];
  dueDate?: number;
};
type Context = {
  statuses: Array<{ key: string; label: string }>;
  people: Array<{ id: string; name: string }>;
  projects: Array<{ id: string; title: string }>;
  labels: Array<{ id: string; name: string }>;
};

export default function UpdateTask() {
  const [query, setQuery] = useState("");
  const { data, isLoading } = useCachedPromise(
    async () =>
      api<Task[]>("search", { workspaceId: await workspaceId(), query }),
    [query],
  );
  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search for a task or issue to update…"
    >
      {data
        ?.filter((item) => item.type === "task")
        .map((task) => (
          <List.Item
            key={task.id}
            title={task.title}
            subtitle={task.identifier}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Update Task"
                  target={<TaskForm task={task} />}
                />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}

function TaskForm({ task }: { task: Task }) {
  const { data, isLoading } = useCachedPromise(async () => {
    const id = await workspaceId();
    return { id, context: await api<Context>("context", { workspaceId: id }) };
  });
  async function submit(
    values: Record<string, string | string[] | Date | null>,
  ) {
    if (!data) return;
    await api("tasks/update", {
      workspaceId: data.id,
      taskId: task.id,
      title: values.title,
      description: values.description,
      status: values.status,
      priority: values.priority,
      assigneeId: values.assigneeId || null,
      projectId: values.projectId || null,
      labelIds: values.labelIds ?? [],
      dueDate: values.dueDate instanceof Date ? values.dueDate.getTime() : null,
    });
    if (typeof values.comment === "string" && values.comment.trim())
      await api("tasks/comment", {
        workspaceId: data.id,
        taskId: task.id,
        body: values.comment,
      });
    await showToast({ style: Toast.Style.Success, title: "Task updated" });
    await popToRoot();
  }
  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Task" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Task"
        text={`${task.identifier} · ${task.title}`}
      />
      <Form.TextField id="title" title="Title" defaultValue={task.title} />
      <Form.TextArea
        id="description"
        title="Description"
        defaultValue={task.description ?? ""}
      />
      <Form.Dropdown id="status" title="Status" defaultValue={task.status}>
        {data?.context.statuses.map((item) => (
          <Form.Dropdown.Item
            key={item.key}
            value={item.key}
            title={item.label}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="priority"
        title="Priority"
        defaultValue={task.priority}
      >
        <Form.Dropdown.Item value="no_priority" title="No priority" />
        <Form.Dropdown.Item value="urgent" title="Urgent" />
        <Form.Dropdown.Item value="high" title="High" />
        <Form.Dropdown.Item value="medium" title="Medium" />
        <Form.Dropdown.Item value="low" title="Low" />
      </Form.Dropdown>
      <Form.Dropdown
        id="assigneeId"
        title="Assignee"
        defaultValue={task.assigneeId ?? ""}
      >
        <Form.Dropdown.Item value="" title="Unassigned" />
        {data?.context.people.map((item) => (
          <Form.Dropdown.Item key={item.id} value={item.id} title={item.name} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="projectId"
        title="Project"
        defaultValue={task.projectId ?? ""}
      >
        <Form.Dropdown.Item value="" title="No project" />
        {data?.context.projects.map((item) => (
          <Form.Dropdown.Item
            key={item.id}
            value={item.id}
            title={item.title}
          />
        ))}
      </Form.Dropdown>
      <Form.TagPicker id="labelIds" title="Labels" defaultValue={task.labelIds}>
        {data?.context.labels.map((item) => (
          <Form.TagPicker.Item
            key={item.id}
            value={item.id}
            title={item.name}
          />
        ))}
      </Form.TagPicker>
      <Form.DatePicker
        id="dueDate"
        title="Due date"
        type={Form.DatePicker.Type.Date}
        defaultValue={task.dueDate ? new Date(task.dueDate) : null}
      />
      <Form.Separator />
      <Form.TextArea id="comment" title="Add comment" />
    </Form>
  );
}
