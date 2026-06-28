import {
  Action,
  ActionPanel,
  Form,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { updateTask, updateTaskLabels, getLabels, Project, Task } from "../api";
import { PRIORITY_MAP } from "../helpers/priorities";

export function EditTaskForm({
  task,
  projects,
  onRefresh,
}: {
  task: Task;
  projects: Project[];
  onRefresh: () => void;
}) {
  const { pop } = useNavigation();

  const { data: labels } = useCachedPromise(getLabels, [], {
    keepPreviousData: true,
  });

  const dueDate =
    task.due_date && new Date(task.due_date).getFullYear() > 1
      ? new Date(task.due_date)
      : null;

  const currentLabelIds = (task.labels ?? []).map((l) => String(l.id));

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

    try {
      await updateTask(task.id, {
        title: values.title.trim(),
        description: values.description?.trim() || "",
        due_date: values.dueDate ? values.dueDate.toISOString() : null,
        priority: parseInt(values.priority) || 0,
        is_favorite: values.isFavorite,
        project_id: parseInt(values.projectId),
      });

      // Update labels: add new ones and remove de-selected ones
      const newLabelIds = values.labelIds?.map((id) => parseInt(id)) ?? [];
      const oldLabelIds = (task.labels ?? []).map((l) => l.id);
      await updateTaskLabels(task.id, oldLabelIds, newLabelIds);

      showToast({ style: Toast.Style.Success, title: "Task updated" });
      onRefresh();
      pop();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to update task",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Task" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" defaultValue={task.title} />
      <Form.TextArea
        id="description"
        title="Description"
        defaultValue={task.description}
      />
      <Form.Dropdown
        id="projectId"
        title="Project"
        defaultValue={String(task.project_id)}
      >
        {projects.map((p) => (
          <Form.Dropdown.Item key={p.id} value={String(p.id)} title={p.title} />
        ))}
      </Form.Dropdown>
      <Form.DatePicker
        id="dueDate"
        title="Due Date"
        type={Form.DatePicker.Type.Date}
        defaultValue={dueDate}
      />
      <Form.Dropdown
        id="priority"
        title="Priority"
        defaultValue={String(task.priority)}
      >
        {Object.entries(PRIORITY_MAP).map(([value, label]) => (
          <Form.Dropdown.Item key={value} value={value} title={label} />
        ))}
      </Form.Dropdown>
      <Form.TagPicker
        id="labelIds"
        title="Labels"
        defaultValue={currentLabelIds}
      >
        {(labels ?? []).map((label) => (
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
        defaultValue={task.is_favorite}
      />
    </Form>
  );
}
