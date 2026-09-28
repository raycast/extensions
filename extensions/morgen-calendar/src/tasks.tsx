import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Detail,
  Form,
  Icon,
  List,
  useNavigation,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  closeTask,
  deleteTask,
  invalidateCache,
  listTasks,
  updateTask,
} from "./lib/morgen";
import { showFailure, showSuccess } from "./lib/ui";
import type { Task } from "./types";

function escapeMarkdown(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\\", "\\\\")
    .replaceAll("*", "\\*")
    .replaceAll("_", "\\_")
    .replaceAll("`", "\\`")
    .replaceAll("[", "\\[")
    .replaceAll("]", "\\]")
    .replaceAll("#", "\\#");
}

function TaskDetails({ task }: { task: Task }) {
  return (
    <Detail
      markdown={`# ${escapeMarkdown(task.title)}\n\n${escapeMarkdown(task.description || "No description")}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Due"
            text={task.due?.replace("T", " ") || "No due date"}
          />
          <Detail.Metadata.Label
            title="Estimated Time"
            text={task.estimatedDuration || "Not set"}
          />
          <Detail.Metadata.Label
            title="Priority"
            text={String(task.priority ?? 0)}
          />
          <Detail.Metadata.Label
            title="Status"
            text={task.progress || "needs-action"}
          />
        </Detail.Metadata>
      }
    />
  );
}

function EditTask({ task, onSaved }: { task: Task; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const { pop } = useNavigation();

  async function submit(values: {
    title: string;
    description: string;
    priority: string;
  }) {
    if (!values.title.trim()) {
      await showFailure(new Error("Enter a task title."));
      return;
    }
    setSaving(true);
    try {
      await updateTask(task, {
        title: values.title.trim(),
        description: values.description.trim(),
        priority: Number(values.priority),
      });
      await showSuccess("Task updated");
      onSaved();
      pop();
    } catch (error) {
      await showFailure(error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Form
      isLoading={saving}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Task"
            icon={Icon.SaveDocument}
            onSubmit={submit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" defaultValue={task.title} />
      <Form.TextArea
        id="description"
        title="Description"
        defaultValue={task.description || ""}
      />
      <Form.Dropdown
        id="priority"
        title="Priority"
        defaultValue={String(task.priority ?? 0)}
      >
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((priority) => (
          <Form.Dropdown.Item
            key={priority}
            value={String(priority)}
            title={priority === 0 ? "None" : String(priority)}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (force = false) => {
    setLoading(true);
    try {
      if (force) invalidateCache();
      setTasks(await listTasks());
    } catch (error) {
      await showFailure(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sorted = useMemo(
    () =>
      [...tasks].sort((a, b) =>
        (a.due || "9999").localeCompare(b.due || "9999"),
      ),
    [tasks],
  );

  async function complete(task: Task) {
    try {
      await closeTask(task);
      await showSuccess("Task completed");
      await load(true);
    } catch (error) {
      await showFailure(error);
    }
  }

  async function remove(task: Task) {
    const confirmed = await confirmAlert({
      title: `Delete “${task.title}”?`,
      message: "This task and any subtasks will be deleted from Morgen.",
      primaryAction: {
        title: "Delete Task",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;
    try {
      await deleteTask(task);
      await showSuccess("Task deleted");
      await load(true);
    } catch (error) {
      await showFailure(error);
    }
  }

  return (
    <List isLoading={loading} searchBarPlaceholder="Search Morgen tasks">
      <List.EmptyView
        title="No Open Tasks"
        description="Morgen returns up to 100 native open tasks here."
      />
      {sorted.map((task) => (
        <List.Item
          key={task.id}
          title={task.title}
          subtitle={task.description}
          accessories={[
            {
              text: task.due
                ? `Due ${task.due.replace("T", " ")}`
                : "No due date",
            },
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Complete Task"
                icon={Icon.CheckCircle}
                onAction={() => void complete(task)}
              />
              <Action.Push
                title="View Task"
                icon={Icon.Eye}
                target={<TaskDetails task={task} />}
              />
              <Action.Push
                title="Edit Task"
                icon={Icon.Pencil}
                target={
                  <EditTask task={task} onSaved={() => void load(true)} />
                }
              />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={() => void load(true)}
              />
              <Action
                title="Delete Task"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => void remove(task)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
