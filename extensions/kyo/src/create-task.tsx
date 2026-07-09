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
import { Tasks } from "./api/resources";
import { PRIORITY_LABELS } from "./api/types";
import { useSpaces, useProjects } from "./hooks/useLookups";
import { showKyoError, toDateOnly } from "./lib/helpers";
import { LogOutAction } from "./components/AuthActions";

interface TaskFormValues {
  name: string;
  space_id: string;
  project_id: string;
  due_date: Date | null;
  start_date: Date | null;
  priority: string;
  description: string;
  is_private: boolean;
}

export default function CreateTask() {
  const { pop } = useNavigation();
  const [spaceId, setSpaceId] = useState<string>("");

  const { data: spaces, isLoading: loadingSpaces } = useSpaces();
  const { data: projects, isLoading: loadingProjects } = useProjects(
    spaceId || undefined,
  );

  async function submit(values: TaskFormValues) {
    if (!values.name.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Name is required",
      });
      return;
    }
    try {
      const task = await Tasks.create({
        name: values.name.trim(),
        space_id: values.space_id || undefined,
        project_id: values.project_id || undefined,
        due_date: toDateOnly(values.due_date) ?? undefined,
        start_date: toDateOnly(values.start_date) ?? undefined,
        priority: values.priority ? Number(values.priority) : undefined,
        description: values.description || undefined,
        is_private: values.is_private || undefined,
      });
      await showToast({
        style: Toast.Style.Success,
        title: "Task created",
        message: task.name,
      });
      pop();
    } catch (error) {
      await showKyoError(error, "Failed to create task");
    }
  }

  return (
    <Form
      isLoading={loadingSpaces}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Task"
            icon={Icon.Plus}
            onSubmit={submit}
          />
          <LogOutAction />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="Ship the landing page"
      />
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
      >
        <Form.Dropdown.Item value="" title="None" />
        {projects.map((p) => (
          <Form.Dropdown.Item key={p.id} value={p.id} title={p.name} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="priority" title="Priority" defaultValue="0">
        {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
          <Form.Dropdown.Item key={value} value={value} title={label} />
        ))}
      </Form.Dropdown>
      <Form.DatePicker
        id="due_date"
        title="Due Date"
        type={Form.DatePicker.Type.Date}
      />
      <Form.DatePicker
        id="start_date"
        title="Start Date"
        type={Form.DatePicker.Type.Date}
      />
      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Details…"
      />
      <Form.Checkbox id="is_private" label="Private task" />
    </Form>
  );
}
