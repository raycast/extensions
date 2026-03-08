import {
  Action,
  ActionPanel,
  Form,
  showToast,
  Toast,
  open,
  getPreferenceValues,
  LaunchType,
  launchCommand,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  getProjects,
  getLabels,
  createTask,
  addLabelsToTask,
  Project,
  Label,
} from "./api";

const PRIORITIES = [
  { value: "0", title: "Unset" },
  { value: "1", title: "Low" },
  { value: "2", title: "Medium" },
  { value: "3", title: "High" },
  { value: "4", title: "Urgent" },
  { value: "5", title: "DO NOW" },
];

export default function CreateTask() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [p, l] = await Promise.all([getProjects(), getLabels()]);
        setProjects(p);
        setLabels(l);
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load data",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  async function handleSubmit(values: {
    title: string;
    description: string;
    projectId: string;
    dueDate: Date | null;
    priority: string;
    labelIds: string[];
    isFavorite: boolean;
  }) {
    if (!values.title.trim()) {
      showToast({ style: Toast.Style.Failure, title: "Title is required" });
      return;
    }

    const projectId = parseInt(values.projectId);
    if (isNaN(projectId)) {
      showToast({
        style: Toast.Style.Failure,
        title: "Please select a project",
      });
      return;
    }

    try {
      showToast({ style: Toast.Style.Animated, title: "Creating task..." });

      const task = await createTask(projectId, {
        title: values.title.trim(),
        description: values.description?.trim() || undefined,
        due_date: values.dueDate ? values.dueDate.toISOString() : null,
        priority: parseInt(values.priority) || 0,
        is_favorite: values.isFavorite,
      });

      if (values.labelIds?.length > 0) {
        const numericLabelIds = values.labelIds.map((id) => parseInt(id));
        await addLabelsToTask(task.id, numericLabelIds);
      }

      showToast({
        style: Toast.Style.Success,
        title: "Task created",
        message: task.title,
        primaryAction: {
          title: "Open in Vikunja",
          onAction: () => {
            const project = projects.find((p) => p.id === projectId);
            if (project) {
              open(`https://tasks.rehmlab.cc/projects/${projectId}`);
            }
          },
        },
      });
    } catch (error) {
      showToast({
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
          <Action.SubmitForm title="Create Task" onSubmit={handleSubmit} />
          <ActionPanel.Section>
            <Action
              title="List Tasks"
              shortcut={{ modifiers: ["cmd"], key: "l" }}
              onAction={() =>
                launchCommand({
                  name: "list-tasks",
                  type: LaunchType.UserInitiated,
                })
              }
            />
            <Action.OpenInBrowser
              title="Open Vikunja"
              url={getPreferenceValues<{ apiUrl: string }>().apiUrl}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        placeholder="Task title"
        autoFocus
      />
      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Optional description"
      />
      <Form.Dropdown id="projectId" title="Project">
        {projects.map((project) => (
          <Form.Dropdown.Item
            key={project.id}
            value={String(project.id)}
            title={project.title}
          />
        ))}
      </Form.Dropdown>
      <Form.DatePicker
        id="dueDate"
        title="Due Date"
        type={Form.DatePicker.Type.Date}
      />
      <Form.Dropdown id="priority" title="Priority" defaultValue="0">
        {PRIORITIES.map((p) => (
          <Form.Dropdown.Item key={p.value} value={p.value} title={p.title} />
        ))}
      </Form.Dropdown>
      <Form.TagPicker id="labelIds" title="Labels">
        {labels.map((label) => (
          <Form.TagPicker.Item
            key={label.id}
            value={String(label.id)}
            title={label.title}
          />
        ))}
      </Form.TagPicker>
      <Form.Checkbox
        id="isFavorite"
        title="Favorite"
        label="Mark as favorite"
        defaultValue={false}
      />
    </Form>
  );
}
