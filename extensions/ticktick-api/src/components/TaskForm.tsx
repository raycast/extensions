import {
  Action,
  ActionPanel,
  Form,
  Icon,
  popToRoot,
  showHUD,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { createTask, updateTask } from "../api";
import {
  PRIORITY_COLORS,
  PRIORITY_ICONS,
  PRIORITY_OPTIONS,
} from "../constants";
import { Project, Task } from "../types";

interface TaskFormProps {
  task?: Task;
  projects: Project[];
  defaultProjectId?: string;
  defaultDate?: Date;
  onSubmit?: () => void;
  isLoadingProjects?: boolean;
}

export function TaskForm({
  task,
  projects,
  defaultProjectId,
  defaultDate,
  onSubmit,
  isLoadingProjects,
}: TaskFormProps) {
  const { pop } = useNavigation();
  const isEditing = !!task;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [titleError, setTitleError] = useState<string | undefined>();

  function validateTitle(value: string) {
    if (!value.trim()) {
      setTitleError("Title is required");
      return false;
    }
    setTitleError(undefined);
    return true;
  }

  async function handleSubmit(values: {
    title: string;
    content: string;
    projectId: string;
    priority: string;
    dueDate: Date | null;
    isAllDay: boolean;
    tags: string;
  }) {
    if (!validateTitle(values.title)) return;

    setIsSubmitting(true);
    try {
      const dueDateStr = values.dueDate
        ? values.dueDate.toISOString().replace(/\.\d{3}Z$/, "+0000")
        : undefined;

      const tags = values.tags
        ? values.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : undefined;

      const taskData: Record<string, unknown> = {
        title: values.title.trim(),
        priority: parseInt(values.priority) || 0,
      };

      if (values.content?.trim()) taskData.content = values.content.trim();
      if (values.projectId) taskData.projectId = values.projectId;
      if (dueDateStr) {
        taskData.dueDate = dueDateStr;
        taskData.isAllDay = values.isAllDay;
        if (!values.isAllDay) {
          taskData.startDate = dueDateStr;
        }
      }
      if (tags && tags.length > 0) taskData.tags = tags;

      if (isEditing) {
        await updateTask(task.id, taskData as Partial<Task>);
        await showHUD(`Updated: "${taskData.title}"`);
        onSubmit?.();
        pop();
      } else {
        await createTask(taskData as Partial<Task>);
        await showHUD(`Added: "${taskData.title}"`);
        onSubmit?.();
        await popToRoot();
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: isEditing ? "Failed to update task" : "Failed to create task",
        message: String(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      navigationTitle={isEditing ? `Edit: ${task.title}` : "New Task"}
      isLoading={isSubmitting || isLoadingProjects}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={isEditing ? "Save Changes" : "Create Task"}
            icon={isEditing ? Icon.Checkmark : Icon.Plus}
            onSubmit={handleSubmit}
          />
          {/* Explicit cancel so the shortcut is discoverable in the panel */}
          <Action
            title="Cancel"
            icon={Icon.Xmark}
            shortcut={{ modifiers: ["cmd"], key: "w" }}
            onAction={pop}
          />
        </ActionPanel>
      }
    >
      {/* Title first — always the first thing to fill in */}
      <Form.TextField
        id="title"
        title="Title"
        placeholder="What needs to be done?"
        defaultValue={task?.title ?? ""}
        error={titleError}
        onChange={(value) => {
          // Clear error as soon as the user starts typing
          if (titleError && value.trim()) setTitleError(undefined);
        }}
        onBlur={(event) => validateTitle(event.target.value ?? "")}
        autoFocus
      />
      <Form.TextArea
        id="content"
        title="Notes"
        placeholder="Additional context, links, or details..."
        defaultValue={task?.content ?? ""}
      />

      <Form.Separator />

      {/* Scheduling fields grouped together */}
      <Form.DatePicker
        id="dueDate"
        title="Due Date"
        type={Form.DatePicker.Type.DateTime}
        defaultValue={
          task?.dueDate ? new Date(task.dueDate) : (defaultDate ?? undefined)
        }
      />
      <Form.Checkbox
        id="isAllDay"
        label="All Day"
        defaultValue={task?.isAllDay ?? true}
        info="Uncheck to set a specific time for this task"
      />
      <Form.Dropdown
        id="priority"
        title="Priority"
        defaultValue={String(task?.priority ?? 0)}
      >
        {PRIORITY_OPTIONS.map((opt) => (
          <Form.Dropdown.Item
            key={opt.value}
            title={opt.title}
            value={opt.value}
            // Same icon+colour as list views — consistent mental model
            icon={{
              source: PRIORITY_ICONS[parseInt(opt.value)] ?? Icon.Circle,
              tintColor: PRIORITY_COLORS[parseInt(opt.value)],
            }}
          />
        ))}
      </Form.Dropdown>

      <Form.Separator />

      {/* Organisation fields grouped together */}
      <Form.Dropdown
        id="projectId"
        title="Project"
        defaultValue={task?.projectId ?? defaultProjectId ?? ""}
      >
        {/* Inbox first — the default landing spot for unorganised tasks */}
        <Form.Dropdown.Item title="Inbox" value="" icon={Icon.Tray} />
        {projects.map((p) => (
          <Form.Dropdown.Item
            key={p.id}
            title={p.name}
            value={p.id}
            icon={Icon.Folder}
          />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="tags"
        title="Tags"
        placeholder="design, urgent, review"
        defaultValue={task?.tags?.join(", ") ?? ""}
        info="Separate multiple tags with commas"
      />
    </Form>
  );
}
