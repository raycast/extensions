import { Action, ActionPanel, Form, Icon, Toast, getPreferenceValues, popToRoot, showToast } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { useState } from "react";
import { createTimesheetLine, listProjects, listTasksForProject, toIsoDate } from "../lib/timesheet-service";

function parseDurationHours(raw: string): number | null {
  const t = raw.trim().replace(",", ".");
  if (!t) return null;
  const n = Number.parseFloat(t);
  if (Number.isNaN(n) || n <= 0) return null;
  return n;
}

export type AddTimesheetLineFormProps = {
  /** After a successful create. Omit to call `popToRoot` (standalone command). */
  onCreated?: () => void | Promise<void>;
};

export function AddTimesheetLineForm({ onCreated }: AddTimesheetLineFormProps) {
  const prefs = getPreferenceValues<Preferences>();

  const { data: projects, isLoading: projectsLoading } = usePromise(
    async () => listProjects(prefs),
    [prefs.email, prefs.password],
  );

  const [projectId, setProjectId] = useState<string>("");

  const { data: tasks, isLoading: tasksLoading } = usePromise(async () => {
    if (!projectId) return [];
    const pid = Number(projectId);
    if (Number.isNaN(pid)) return [];
    return listTasksForProject(prefs, pid);
  }, [projectId, prefs.email, prefs.password]);

  async function handleSubmit(values: {
    projectId: string;
    taskId: string;
    date: Date | null;
    duration: string;
    description: string;
  }) {
    const pid = Number(values.projectId);
    const tid = Number(values.taskId);
    if (!values.projectId || Number.isNaN(pid)) {
      await showToast({ style: Toast.Style.Failure, title: "Select a project" });
      return;
    }
    if (!values.taskId || Number.isNaN(tid)) {
      await showToast({ style: Toast.Style.Failure, title: "Select a task" });
      return;
    }
    const hours = parseDurationHours(values.duration);
    if (hours == null) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid duration",
        message: "Use hours as a positive number (e.g. 1 or 1.5).",
      });
      return;
    }
    const date = values.date ?? new Date();
    const dateStr = toIsoDate(date);

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Saving timesheet…",
      message: "Mindnow Odoo",
    });

    try {
      await createTimesheetLine(prefs, {
        projectId: pid,
        taskId: tid,
        date: dateStr,
        hours,
        description: values.description?.trim() || undefined,
      });
      toast.style = Toast.Style.Success;
      toast.title = "Timesheet line added";
      toast.message = `${dateStr} · ${hours}h`;
      if (onCreated) await onCreated();
      else await popToRoot();
    } catch (e) {
      await toast.hide();
      await showFailureToast(e, { title: "Could not create line" });
    }
  }

  const loading = projectsLoading || (!!projectId && tasksLoading);

  return (
    <Form
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Create a timesheet entry on account.analytic.line (Mindnow Odoo)." />
      <Form.Dropdown id="projectId" title="Project" onChange={setProjectId}>
        {projects?.map((p) => <Form.Dropdown.Item key={p.id} value={String(p.id)} title={p.name} />) ?? []}
      </Form.Dropdown>
      <Form.Dropdown key={projectId || "none"} id="taskId" title="Task">
        {(tasks ?? []).map((t) => (
          <Form.Dropdown.Item key={t.id} value={String(t.id)} title={t.name} />
        ))}
      </Form.Dropdown>
      <Form.DatePicker id="date" title="Date" defaultValue={new Date()} />
      <Form.TextField id="duration" title="Duration (hours)" placeholder="e.g. 1 or 1.5" />
      <Form.TextField id="description" title="Description" placeholder="Optional — defaults to /" />
    </Form>
  );
}
