import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  Icon,
  showHUD,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { KeitoGate } from "./components/KeitoGate";
import { entryEditability, formatHours as formatHoursValue } from "./services/keito/normalize";
import { ResolvedSession, scopedKey } from "./services/keito/session";
import { Project, TimeEntry } from "./services/keito/types";
import { EntryField, planEntry, startTimer } from "./services/keito/workflows";
import { resolveEntryMode } from "./services/keito/dates";
import { parseDuration } from "./services/parseDuration";
import {
  confirmReplaceRunning,
  getApi,
  getKeitoPreferences,
  refreshMenuBar,
  todayString,
  showKeitoError,
  useProjects,
  useProjectTasks,
} from "./services/useKeito";

export interface EntryFormProps {
  session: ResolvedSession;
  /** Existing entry to edit. */
  entry?: TimeEntry;
  /** Entry to copy into a new one (duplicate). */
  template?: TimeEntry;
  viewDate?: Date | null;
  onSave?: () => Promise<void> | void;
}

export function groupProjectsByClient(
  projects: Project[],
): { clientKey: string; clientName: string; projects: Project[] }[] {
  const groups = new Map<string, { clientKey: string; clientName: string; projects: Project[] }>();
  for (const project of projects) {
    const clientKey = project.clientId ?? "no-client";
    const group = groups.get(clientKey) ?? { clientKey, clientName: project.clientName ?? "No Client", projects: [] };
    group.projects.push(project);
    groups.set(clientKey, group);
  }
  return [...groups.values()]
    .sort((a, b) => a.clientName.localeCompare(b.clientName))
    .map((g) => ({ ...g, projects: g.projects.sort((a, b) => a.name.localeCompare(b.name)) }));
}

export function projectTitle(project: Project, showClient: boolean): string {
  return `${showClient && project.clientName ? `${project.clientName} – ` : ""}${
    project.code ? `[${project.code}] ` : ""
  }${project.name}`;
}

export function ProjectDropdownItems({ projects }: { projects: Project[] }) {
  const { showClientInProject = false } = getKeitoPreferences();
  const groups = useMemo(() => groupProjectsByClient(projects), [projects]);
  return (
    <>
      {groups.map((group) => (
        <Form.Dropdown.Section title={group.clientName} key={group.clientKey}>
          {group.projects.map((project) => (
            <Form.Dropdown.Item
              key={project.id}
              value={project.id}
              title={projectTitle(project, showClientInProject)}
              keywords={[group.clientName.toLowerCase(), ...(project.code ? [project.code.toLowerCase()] : [])]}
            />
          ))}
        </Form.Dropdown.Section>
      ))}
    </>
  );
}

export function EntryForm({ session, entry, template, viewDate, onSave }: EntryFormProps) {
  const { pop } = useNavigation();
  const prefs = getKeitoPreferences();
  const settings = session.identity.settings ?? { requireNotes: false };
  const mode = resolveEntryMode(prefs.entryMode, settings);
  const timeFormat = prefs.timeFormat ?? "hours_minutes";
  const source = entry ?? template;
  const isEdit = !!entry;
  const isRunning = !!entry?.isRunning;
  const lock = entry ? entryEditability(entry) : undefined;

  const { data: projects, isLoading: isLoadingProjects, byId } = useProjects(session.scope);
  const [projectId, setProjectId] = useState<string | null>(source?.projectId ?? null);
  const [taskId, setTaskId] = useState<string | null>(source?.taskId ?? null);
  const { data: tasks, isLoading: isLoadingTasks } = useProjectTasks(session.scope, projectId);
  const [notes, setNotes] = useState(source?.notes ?? "");
  const [duration, setDuration] = useState(
    source && !source.isRunning ? formatHoursValue(source.hours, timeFormat) : "",
  );
  const [startTime, setStartTime] = useState(entry?.startedTime ?? "");
  const [endTime, setEndTime] = useState(entry && !isRunning ? (entry.endedTime ?? "") : "");
  const [spentDate, setSpentDate] = useState<Date>(
    entry ? dayjs(entry.spentDate).toDate() : (viewDate ?? dayjs(todayString(session)).toDate()),
  );
  const [errors, setErrors] = useState<Partial<Record<Exclude<EntryField, "form">, string>>>({});

  const {
    value: lastProject,
    setValue: setLastProject,
    isLoading: isLoadingLastProject,
  } = useLocalStorage<{ projectId: string; taskId: string }>(scopedKey(session.scope, "lastProject"));

  // Choose the project once projects load: keep a valid selection (or an existing entry's project,
  // even if archived), otherwise use this account's last project, otherwise the first project.
  useEffect(() => {
    if (isLoadingProjects || !projects.length || (!source && isLoadingLastProject)) return;
    if (projectId && (byId.has(projectId) || source)) return;
    if (!source && lastProject && byId.has(lastProject.projectId)) {
      setProjectId(lastProject.projectId);
      setTaskId(lastProject.taskId);
      return;
    }
    setProjectId(projects[0].id);
  }, [projects, isLoadingProjects, isLoadingLastProject, lastProject]);

  // Keep the selected task valid for the selected project. An empty list may still be loading,
  // so only replace the task once the project's tasks are known.
  useEffect(() => {
    if (isLoadingTasks || !projectId || !tasks.length) return;
    if (taskId && tasks.some((t) => t.id === taskId)) return;
    setTaskId(tasks[0].id);
  }, [tasks, isLoadingTasks, projectId]);

  // Never submit a task that is not assigned to the selected project.
  const selectedTaskId = taskId && tasks.some((t) => t.id === taskId) ? taskId : null;

  const selectedProject = projectId ? byId.get(projectId) : undefined;

  function normalizeDurationField(value: string) {
    if (!value.trim()) return;
    const parsed = parseDuration(value);
    if (!parsed) {
      setErrors((e) => ({ ...e, duration: "Invalid duration" }));
      return;
    }
    setDuration(formatHoursValue(Math.round(parsed.asMinutes()) / 60, timeFormat));
  }

  async function handleSubmit() {
    const date = dayjs(spentDate).format("YYYY-MM-DD");
    const plan = planEntry(
      { projectId, taskId: selectedTaskId, spentDate: date, notes, duration, startTime, endTime },
      {
        mode,
        existing: entry,
        externalReference: template?.externalReference,
        requireNotes: settings.requireNotes,
        allowPastTimerStarts: settings.allowPastTimerStarts,
      },
    );

    if (plan.kind === "error") {
      if (plan.field === "form") await showToast({ style: Toast.Style.Failure, title: plan.message });
      else setErrors({ [plan.field]: plan.message });
      return;
    }

    if (plan.kind === "timer" && date !== todayString(session)) {
      const confirmed = await confirmAlert({
        icon: Icon.ExclamationMark,
        title: "Start a Timer on Another Day?",
        message: "You are starting a timer on a date other than today. Did you mean to enter a duration instead?",
        primaryAction: { title: "Start Timer", style: Alert.ActionStyle.Destructive },
      });
      if (!confirmed) return;
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: "Saving to Keito…" });
    try {
      const api = getApi();
      let hud: string;
      if (plan.kind === "timer") {
        const result = await startTimer(
          { api, userId: session.identity.userId, confirmReplace: confirmReplaceRunning },
          plan.input,
        );
        if (result.status === "cancelled") {
          await toast.hide();
          return;
        }
        hud = result.replaced ? "Switched Timer" : "Timer Started";
      } else if (plan.kind === "create") {
        await api.createTimeEntry(plan.body);
        hud = "Time Entry Created";
      } else {
        await api.updateTimeEntry(plan.id, plan.body);
        hud = "Time Entry Updated";
      }
      if (projectId && selectedTaskId) await setLastProject({ projectId, taskId: selectedTaskId });
      await toast.hide();
      await onSave?.();
      await refreshMenuBar();
      await showHUD(hud);
      pop();
    } catch (error) {
      await toast.hide();
      await showKeitoError(error, "Could not save the time entry");
    }
  }

  const submitTitle = isEdit
    ? "Update Time Entry"
    : (mode === "duration" ? duration.trim() : endTime.trim())
      ? "Create Time Entry"
      : "Start Timer";

  return (
    <Form
      navigationTitle={isEdit ? "Edit Time Entry" : template ? "Duplicate Time Entry" : undefined}
      isLoading={isLoadingProjects || isLoadingTasks || (!source && isLoadingLastProject)}
      actions={
        <ActionPanel>
          {lock?.canEdit !== false && (
            <Action.SubmitForm title={submitTitle} icon={Icon.Clock} onSubmit={handleSubmit} />
          )}
        </ActionPanel>
      }
    >
      {lock && !lock.canEdit && (
        <Form.Description title="Locked" text={lock.reason ?? "This entry cannot be changed."} />
      )}
      {prefs.showClient && (
        <Form.Description title="Client" text={selectedProject?.clientName ?? source?.clientName ?? ""} />
      )}
      <Form.Dropdown
        id="project_id"
        title="Project"
        value={projectId ?? ""}
        error={errors.project}
        onChange={(value) => {
          setProjectId(value || null);
          setErrors((e) => ({ ...e, project: undefined, task: undefined }));
        }}
      >
        {source && projectId === source.projectId && !byId.has(source.projectId) && (
          <Form.Dropdown.Item value={source.projectId} title={`${source.projectName} (not in your active projects)`} />
        )}
        <ProjectDropdownItems projects={projects} />
      </Form.Dropdown>
      <Form.Dropdown
        id="task_id"
        title="Task"
        value={selectedTaskId ?? ""}
        error={errors.task}
        info="Only tasks assigned to the selected project are listed."
        onChange={(value) => {
          setTaskId(value || null);
          setErrors((e) => ({ ...e, task: undefined }));
        }}
      >
        {tasks.map((task) => (
          <Form.Dropdown.Item key={task.id} value={task.id} title={task.name} />
        ))}
      </Form.Dropdown>

      <Form.Separator />

      <Form.TextArea
        id="notes"
        title="Notes"
        placeholder="What did you work on?"
        value={notes}
        error={errors.notes}
        info={settings.requireNotes ? "Your Keito workspace requires notes." : undefined}
        onChange={(v) => {
          setNotes(v);
          setErrors((e) => ({ ...e, notes: undefined }));
        }}
      />

      {isRunning && (
        <Form.Description title="Timer" text="This timer is running. Stop it before changing its duration." />
      )}
      {!isRunning && mode === "start_end" && (
        <>
          <Form.TextField
            id="started_time"
            title="Start Time"
            placeholder={isEdit ? "HH:mm" : "Leave blank to start now"}
            value={startTime}
            error={errors.startTime}
            info="Workspace time, e.g. 09:30 or 9:30am. A past start for a new timer requires Keito's Past timer starts setting."
            onChange={(v) => {
              setStartTime(v);
              setErrors((e) => ({ ...e, startTime: undefined }));
            }}
          />
          <Form.TextField
            id="ended_time"
            title="End Time"
            placeholder={isEdit ? "HH:mm" : "Leave blank to start a timer"}
            value={endTime}
            error={errors.endTime}
            onChange={(v) => {
              setEndTime(v);
              setErrors((e) => ({ ...e, endTime: undefined }));
            }}
          />
        </>
      )}
      {!isRunning && mode === "duration" && (
        <Form.TextField
          id="hours"
          title="Duration"
          placeholder={isEdit ? "e.g. 1:30" : "Leave blank to start a timer"}
          value={duration}
          error={errors.duration}
          onChange={(v) => {
            setDuration(v);
            setErrors((e) => ({ ...e, duration: undefined }));
          }}
          onBlur={(e) => normalizeDurationField(e.target.value ?? "")}
          info="Enter decimal hours or h:mm, durations like 1h30m, or simple math like 1+15m-5m."
        />
      )}
      <Form.DatePicker
        id="spent_date"
        title="Date"
        type={Form.DatePicker.Type.Date}
        value={spentDate}
        onChange={(value) => value && setSpentDate(value)}
      />
    </Form>
  );
}

export default function Command() {
  return <KeitoGate>{(session) => <EntryForm session={session} />}</KeitoGate>;
}
