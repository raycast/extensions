import {
  Action,
  ActionPanel,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { Tasks } from "../api/resources";
import type { Task } from "../api/types";
import { PRIORITY_LABELS } from "../api/types";
import { useSpaces, useProjects } from "../hooks/useLookups";
import { showKyoError, toDateOnly } from "../lib/helpers";

export function EditTaskForm({
  task,
  onSaved,
}: {
  task: Task;
  onSaved?: () => void;
}) {
  const { pop } = useNavigation();
  const [spaceId, setSpaceId] = useState<string>(task.space_id ?? "");

  const { data: spaces } = useSpaces();
  const { data: projects, isLoading: loadingProjects } = useProjects(
    spaceId || undefined,
  );

  async function submit(values: {
    name: string;
    space_id: string;
    project_id: string;
    due_date: Date | null;
    priority: string;
    description: string;
    is_private: boolean;
    completed: boolean;
  }) {
    try {
      // PATCH semantics: null CLEARS a field, undefined leaves it untouched —
      // so "None"/empty selections here must send null, not be dropped.
      await Tasks.update(task.id, {
        name: values.name.trim(),
        space_id: values.space_id || null,
        project_id: values.project_id || null,
        due_date: toDateOnly(values.due_date),
        priority: Number(values.priority) || 0,
        description: values.description || null,
        is_private: values.is_private,
        completed: values.completed,
      });
      await showToast({ style: Toast.Style.Success, title: "Task updated" });
      onSaved?.();
      pop();
    } catch (error) {
      await showKyoError(error, "Failed to update task");
    }
  }

  return (
    <Form
      navigationTitle={`Edit · ${task.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Changes"
            icon={Icon.Check}
            onSubmit={submit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" defaultValue={task.name} />
      <Form.Dropdown
        id="space_id"
        title="Space"
        value={spaceId}
        onChange={setSpaceId}
      >
        <Form.Dropdown.Item value="" title="No space (workspace task)" />
        {spaces.map((s) => (
          <Form.Dropdown.Item key={s.id} value={s.id} title={s.name} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="project_id"
        title="Project"
        isLoading={loadingProjects}
        defaultValue={task.project_id ?? ""}
      >
        <Form.Dropdown.Item value="" title="None" />
        {projects.map((p) => (
          <Form.Dropdown.Item key={p.id} value={p.id} title={p.name} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="priority"
        title="Priority"
        defaultValue={String(task.priority ?? 0)}
      >
        {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
          <Form.Dropdown.Item key={value} value={value} title={label} />
        ))}
      </Form.Dropdown>
      <Form.DatePicker
        id="due_date"
        title="Due Date"
        type={Form.DatePicker.Type.Date}
        defaultValue={task.due_date ? new Date(task.due_date) : null}
      />
      <Form.TextArea
        id="description"
        title="Description"
        defaultValue={task.description ?? ""}
      />
      <Form.Checkbox
        id="completed"
        label="Completed"
        defaultValue={task.completed ?? false}
      />
      <Form.Checkbox
        id="is_private"
        label="Private task"
        defaultValue={task.is_private ?? false}
      />
    </Form>
  );
}
