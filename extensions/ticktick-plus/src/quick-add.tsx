import { Form, ActionPanel, Action, showHUD, popToRoot, showToast, Toast, LaunchProps } from "@raycast/api";
import { createTask } from "./api/tasks";
import { useSync } from "./hooks/useSync";
import { useAlerts } from "./hooks/useAlerts";
import { Project } from "./types/ticktick";
import { format } from "date-fns";

interface Arguments {
  title?: string;
}

export default function QuickAdd(props: LaunchProps<{ arguments: Arguments }>) {
  useAlerts();
  const { data, isLoading } = useSync();

  const inboxId = data.inboxId;
  const allProjects = data.projects.filter((p) => !p.closed);

  const sorted: Array<Pick<Project, "id" | "name">> = [
    ...(inboxId ? [{ id: inboxId, name: "Inbox" }] : []),
    ...allProjects.filter((p) => p.id !== inboxId),
  ];

  async function handleSubmit(values: {
    title: string;
    projectId: string;
    priority: string;
    dueDate?: Date | null;
    content?: string;
    tags?: string;
  }) {
    if (!values.title.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Title is required" });
      return;
    }

    const projectId = values.projectId || inboxId;
    if (!projectId) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not detect Inbox",
        message: "Open the Inbox command first to sync, then try again.",
      });
      return;
    }

    try {
      const tags = values.tags
        ?.split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      await createTask({
        title: values.title.trim(),
        projectId,
        priority: (parseInt(values.priority, 10) as 0 | 1 | 3 | 5) || 0,
        ...(values.dueDate && { dueDate: format(values.dueDate, "yyyy-MM-dd'T'00:00:00.000+0000"), isAllDay: true }),
        ...(values.content?.trim() && { content: values.content.trim() }),
        ...(tags && tags.length > 0 && { tags }),
      });
      await showHUD(`✅ Added: ${values.title}`);
      await popToRoot();
    } catch (err) {
      await showToast({ style: Toast.Style.Failure, title: "Failed to add task", message: String(err) });
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
        id="title"
        title="Task"
        placeholder="What needs to be done?"
        defaultValue={props.arguments?.title ?? ""}
        autoFocus
      />
      <Form.TextArea id="content" title="Notes" placeholder="Optional description..." />
      <Form.Dropdown id="projectId" title="Project" defaultValue={inboxId || sorted[0]?.id}>
        {sorted.map((p) => (
          <Form.Dropdown.Item key={p.id} value={p.id} title={p.name} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="priority" title="Priority" defaultValue="0">
        <Form.Dropdown.Item value="0" title="None" />
        <Form.Dropdown.Item value="1" title="Low" />
        <Form.Dropdown.Item value="3" title="Medium" />
        <Form.Dropdown.Item value="5" title="High" />
      </Form.Dropdown>
      <Form.DatePicker id="dueDate" title="Due Date" type={Form.DatePicker.Type.Date} />
      <Form.TextField id="tags" title="Tags" placeholder="work, urgent (comma-separated)" />
      {data.tags.length > 0 && <Form.Description title="Your Tags" text={data.tags.map((t) => t.name).join(", ")} />}
    </Form>
  );
}
