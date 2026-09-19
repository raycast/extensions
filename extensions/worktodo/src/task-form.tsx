import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useMemo, useState } from "react";
import {
  TaskEditingInteraction,
  taskEditingDefaults,
  taskEditingProjectKey,
  type TaskEditingFailureField,
} from "./shared/application/task-editing";
import type { Label, Project, Task } from "./shared/domain/model";
import type { TaskService } from "./shared/domain/task-service";
import { DueDateFields, LabelPicker, ProjectDropdown } from "./task-form-controls";

type FormValues = {
  title: string;
  notes: string;
};

export function TaskForm({
  service,
  task,
  projects,
  labels,
  initialProjectId,
  viewerTimeZone,
  onSaved,
}: {
  service: TaskService;
  task?: Task;
  projects: readonly Project[];
  labels: readonly Label[];
  initialProjectId: string | null;
  viewerTimeZone: string;
  onSaved: () => void;
}) {
  const { pop } = useNavigation();
  const [referenceInstantMs] = useState(Date.now);
  const editing = useMemo(() => new TaskEditingInteraction(service), [service]);
  const defaults = useMemo(
    () => taskEditingDefaults(task, initialProjectId, referenceInstantMs, viewerTimeZone),
    [initialProjectId, referenceInstantMs, task, viewerTimeZone],
  );
  const [priority, setPriority] = useState(defaults.priority);
  const [dueDatePreset, setDueDatePreset] = useState(defaults.dueDatePreset);
  const [customDueDate, setCustomDueDate] = useState<Date | null>(() =>
    defaults.customDueAtMs === null ? null : new Date(defaults.customDueAtMs),
  );
  const [selectedProject, setSelectedProject] = useState(defaults.selectedProject);
  const [selectedLabelIds, setSelectedLabelIds] = useState(defaults.selectedLabelIds);
  const [titleError, setTitleError] = useState<string>();
  const [dueError, setDueError] = useState<string>();
  const [projectError, setProjectError] = useState<string>();
  const [labelError, setLabelError] = useState<string>();
  const [formError, setFormError] = useState<string>();

  async function submit(values: FormValues): Promise<boolean> {
    setTitleError(undefined);
    setDueError(undefined);
    setProjectError(undefined);
    setLabelError(undefined);
    setFormError(undefined);
    const outcome = editing.save(
      task,
      {
        title: values.title,
        notes: values.notes,
        priority,
        dueDatePreset,
        customDueAtMs: customDueDate?.getTime() ?? null,
        selectedProject,
        selectedLabelIds,
      },
      { referenceInstantMs, viewerTimeZone, projects, labels },
    );
    if (outcome.status === "failed") {
      const setFieldError: Record<TaskEditingFailureField, (message: string) => void> = {
        title: setTitleError,
        due: setDueError,
        project: setProjectError,
        labels: setLabelError,
        form: setFormError,
      };
      setFieldError[outcome.field](outcome.message);
      await showToast(Toast.Style.Failure, task ? "Unable to update task" : "Unable to create task", outcome.message);
      return false;
    }

    onSaved();
    await showToast(Toast.Style.Success, task ? "Task updated" : "Task created");
    pop();
    return true;
  }

  return (
    <Form
      navigationTitle={task ? "Edit task" : "New task"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={task ? "Save Task" : "Create Task"} icon={Icon.Check} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        defaultValue={defaults.title}
        error={titleError}
        autoFocus
        onChange={() => setTitleError(undefined)}
      />
      {!task ? (
        <ProjectDropdown
          projects={projects}
          value={selectedProject}
          error={projectError}
          onChange={(project) => {
            setSelectedProject(project);
            setProjectError(undefined);
          }}
        />
      ) : null}
      <LabelPicker
        labels={labels}
        value={selectedLabelIds}
        error={labelError}
        onChange={(value) => {
          setSelectedLabelIds(value);
          setLabelError(undefined);
        }}
      />
      <DueDateFields
        preset={dueDatePreset}
        customDate={customDueDate}
        error={dueError}
        onPresetChange={(preset) => {
          setDueDatePreset(preset);
          setDueError(undefined);
        }}
        onCustomDateChange={(date) => {
          setCustomDueDate(date);
          setDueError(undefined);
        }}
      />
      <Form.TextArea id="notes" title="Notes" defaultValue={defaults.notes} />
      <Form.Checkbox id="priority" label="Priority" value={priority} onChange={setPriority} />
      {formError ? <Form.Description title="Error" text={formError} /> : null}
    </Form>
  );
}

export function MoveTaskForm({
  service,
  task,
  projects,
  onSaved,
}: {
  service: TaskService;
  task: Task;
  projects: readonly Project[];
  onSaved: () => void;
}) {
  const { pop } = useNavigation();
  const editing = useMemo(() => new TaskEditingInteraction(service), [service]);
  const [selectedProject, setSelectedProject] = useState(() => taskEditingProjectKey(task.projectId));
  const [projectError, setProjectError] = useState<string>();
  const [formError, setFormError] = useState<string>();

  async function submit(): Promise<boolean> {
    setFormError(undefined);
    setProjectError(undefined);
    const outcome = editing.move(task.id, selectedProject, projects);
    if (outcome.status === "failed") {
      if (outcome.field === "project") {
        setProjectError(outcome.message);
      } else {
        setFormError(outcome.message);
      }
      await showToast(Toast.Style.Failure, "Unable to move task", outcome.message);
      return false;
    }

    onSaved();
    await showToast(Toast.Style.Success, "Task moved");
    pop();
    return true;
  }

  return (
    <Form
      navigationTitle="Move task"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Move Task" icon={Icon.ArrowRight} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Task" text={task.title} />
      <ProjectDropdown
        projects={projects}
        value={selectedProject}
        error={projectError}
        onChange={(project) => {
          setSelectedProject(project);
          setProjectError(undefined);
        }}
      />
      {formError ? <Form.Description title="Error" text={formError} /> : null}
    </Form>
  );
}

export function EditLabelsForm({
  service,
  task,
  labels,
  onSaved,
}: {
  service: TaskService;
  task: Task;
  labels: readonly Label[];
  onSaved: () => void;
}) {
  const { pop } = useNavigation();
  const editing = useMemo(() => new TaskEditingInteraction(service), [service]);
  const [selectedLabelIds, setSelectedLabelIds] = useState(task.labelIds);
  const [labelError, setLabelError] = useState<string>();
  const [formError, setFormError] = useState<string>();

  async function submit(): Promise<boolean> {
    setLabelError(undefined);
    setFormError(undefined);
    const outcome = editing.assignLabels(task.id, selectedLabelIds);
    if (outcome.status === "failed") {
      if (outcome.field === "labels") {
        setLabelError(outcome.message);
      } else {
        setFormError(outcome.message);
      }
      await showToast(Toast.Style.Failure, "Unable to update labels", outcome.message);
      return false;
    }

    onSaved();
    await showToast(Toast.Style.Success, "Labels updated");
    pop();
    return true;
  }

  return (
    <Form
      navigationTitle="Edit labels"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Labels" icon={Icon.Tag} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Task" text={task.title} />
      <LabelPicker
        labels={labels}
        value={selectedLabelIds}
        error={labelError}
        onChange={(value) => {
          setSelectedLabelIds(value);
          setLabelError(undefined);
        }}
      />
      {formError ? <Form.Description title="Error" text={formError} /> : null}
    </Form>
  );
}
