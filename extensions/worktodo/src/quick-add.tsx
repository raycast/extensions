import { Action, ActionPanel, closeMainWindow, Form, Icon, PopToRootType, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { requestMenuBarRefresh } from "./raycast-commands";
import {
  createOperationScopedTaskEditingMutations,
  TaskEditingInteraction,
  taskEditingProjectKey,
  type DueDatePreset,
  type TaskEditingFailureField,
} from "./shared/application/task-editing";
import { openProductionWorktodo, type WorktodoSession } from "./shared/application/worktodo";
import type { Label, Project } from "./shared/domain/model";
import { DueDateFields, LabelPicker, ProjectDropdown } from "./task-form-controls";

type QuickAddFormValues = {
  title: string;
  notes: string;
};

type QuickAddState = {
  projects: Project[];
  labels: Label[];
  error: string | null;
};

function messageFrom(error: unknown): string {
  return error instanceof Error ? error.message : "An unexpected error occurred";
}

export default function QuickAdd() {
  const [viewerTimeZone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [referenceInstantMs] = useState(Date.now);
  const [state] = useState<QuickAddState>(() => {
    let session: WorktodoSession | undefined;
    try {
      session = openProductionWorktodo();
      return {
        projects: session.service.listProjects(),
        labels: session.service.listLabels(),
        error: null,
      };
    } catch (error) {
      return { projects: [], labels: [], error: messageFrom(error) };
    } finally {
      session?.close();
    }
  });
  const [editing] = useState(
    () => new TaskEditingInteraction(createOperationScopedTaskEditingMutations(openProductionWorktodo)),
  );
  const [selectedProject, setSelectedProject] = useState(() => taskEditingProjectKey(null));
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);
  const [dueDatePreset, setDueDatePreset] = useState<DueDatePreset>("none");
  const [customDueDate, setCustomDueDate] = useState<Date | null>(null);
  const [titleError, setTitleError] = useState<string>();
  const [dueError, setDueError] = useState<string>();
  const [projectError, setProjectError] = useState<string>();
  const [labelError, setLabelError] = useState<string>();
  const [formError, setFormError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(values: QuickAddFormValues): Promise<boolean> {
    setTitleError(undefined);
    setDueError(undefined);
    setProjectError(undefined);
    setLabelError(undefined);
    setFormError(undefined);
    if (state.error) {
      return false;
    }

    setIsSubmitting(true);
    const outcome = editing.save(
      undefined,
      {
        title: values.title,
        notes: values.notes,
        priority: false,
        dueDatePreset,
        customDueAtMs: customDueDate?.getTime() ?? null,
        selectedProject,
        selectedLabelIds,
      },
      { referenceInstantMs, viewerTimeZone, projects: state.projects, labels: state.labels },
    );
    if (outcome.status === "failed") {
      setIsSubmitting(false);
      const setFieldError: Record<TaskEditingFailureField, (message: string) => void> = {
        title: setTitleError,
        due: setDueError,
        project: setProjectError,
        labels: setLabelError,
        form: setFormError,
      };
      setFieldError[outcome.field](outcome.message);
      await showToast(Toast.Style.Failure, "Unable to create task", outcome.message);
      return false;
    }

    requestMenuBarRefresh();
    await showToast(Toast.Style.Success, "Task created");
    await closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });
    return true;
  }

  return (
    <Form
      navigationTitle="Quick add"
      isLoading={isSubmitting}
      actions={
        state.error === null ? (
          <ActionPanel>
            <Action.SubmitForm title="Create Task" icon={Icon.Plus} onSubmit={submit} />
          </ActionPanel>
        ) : undefined
      }
    >
      <Form.TextField id="title" title="Title" autoFocus error={titleError} onChange={() => setTitleError(undefined)} />
      <ProjectDropdown
        projects={state.projects}
        value={selectedProject}
        error={projectError}
        onChange={(project) => {
          setSelectedProject(project);
          setProjectError(undefined);
        }}
      />
      <LabelPicker
        labels={state.labels}
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
      <Form.TextArea id="notes" title="Notes" />
      {formError ? <Form.Description title="Error" text={formError} /> : null}
      {state.error ? <Form.Description title="Unable to open Worktodo" text={state.error} /> : null}
    </Form>
  );
}
