import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useState, useEffect, useRef, ReactNode, useMemo } from "react";
import { usePromise, useCachedPromise } from "@raycast/utils";
import {
  HakunaClient,
  Project,
  Task,
  CompanyResponse,
  formatDuration,
} from "./hakuna-api";

export interface TimerFormInitialValues {
  projectId?: string;
  taskId?: string;
  startTime?: string;
  endTime?: string;
  note?: string;
}

interface Props {
  apiToken: string;
  mode: "timer" | "entry";
  loadInitialValues?: (
    timer: HakunaClient,
  ) => Promise<TimerFormInitialValues | undefined>;
  timerDate?: string;
  onSubmit: (values: {
    taskId: string;
    projectId?: string;
    startTime?: string;
    endTime?: string;
    note: string;
  }) => Promise<void>;
  extraActions?: ReactNode;
  submitLabel?: string;
  endTimeRequired?: boolean;
}

function currentTime(): string {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
}

function parseTime(input: string): string | null {
  const s = input.trim().replace(/[.,;]/g, ":");
  let hours: number;
  let minutes: number;

  const parts = s.split(":");

  if (parts.length === 1) {
    const digits = parts[0];
    if (!/^\d+$/.test(digits) || digits.length === 0) return null;

    if (digits.length === 1) {
      hours = parseInt(digits, 10);
      minutes = 0;
    } else if (digits.length === 2) {
      const n = parseInt(digits, 10);
      if (n <= 23) {
        hours = n;
        minutes = 0;
      } else {
        hours = parseInt(digits[0], 10);
        minutes = parseInt(digits[1], 10) * 10;
      }
    } else if (digits.length === 3) {
      const firstTwo = parseInt(digits.substring(0, 2), 10);
      if (firstTwo <= 23) {
        hours = firstTwo;
        minutes = parseInt(digits[2], 10) * 10;
      } else {
        hours = parseInt(digits[0], 10);
        minutes = parseInt(digits.substring(1), 10);
      }
    } else if (digits.length === 4) {
      hours = parseInt(digits.substring(0, 2), 10);
      minutes = parseInt(digits.substring(2), 10);
    } else {
      return null;
    }
  } else if (parts.length === 2) {
    const [hStr, mStr] = parts;
    if (!/^\d+$/.test(hStr)) return null;
    hours = parseInt(hStr, 10);
    if (mStr === "") {
      minutes = 0;
    } else if (!/^\d+$/.test(mStr)) {
      return null;
    } else if (mStr.length === 1) {
      minutes = parseInt(mStr, 10) * 10;
    } else {
      minutes = parseInt(mStr, 10);
    }
  } else if (parts.length === 3) {
    const [hStr, mStr, sStr] = parts;
    if (!/^\d+$/.test(hStr) || !/^\d+$/.test(mStr) || !/^\d+$/.test(sStr))
      return null;
    hours = parseInt(hStr, 10);
    minutes = parseInt(mStr, 10);
    if (parseInt(sStr, 10) > 0) minutes++;
  } else {
    return null;
  }

  if (minutes > 60) return null;
  if (minutes === 60) {
    minutes = 0;
    hours++;
  }

  if (hours === 24 && minutes === 0) hours = 0;
  else if (hours > 23) return null;

  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

export default function TimerForm({
  apiToken,
  mode,
  loadInitialValues,
  timerDate,
  onSubmit,
  extraActions,
  submitLabel,
  endTimeRequired,
}: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [startTime, setStartTime] = useState(currentTime());
  const [endTime, setEndTime] = useState("");
  const [note, setNote] = useState("");
  const [duration, setDuration] = useState("");
  const firstFieldRef = useRef<Form.ItemReference>(null);
  const originalStartTime = useRef<string | null>(null);
  const pendingTaskId = useRef<string | null>(null);

  const { data: company, isLoading: companyLoading } = useCachedPromise(
    (token: string) => new HakunaClient(token).getCompany(),
    [apiToken],
  );
  const projectsEnabled = company?.projects_enabled ?? false;
  const durationFormat = company?.duration_format ?? "hhmm";

  useEffect(() => {
    const pStart = parseTime(startTime);
    const pEnd = parseTime(endTime);
    if (endTime && pStart && pEnd) {
      const [sh, sm] = pStart.split(":").map(Number);
      const [eh, em] = pEnd.split(":").map(Number);
      const startMins = sh * 60 + sm;
      const endMins = eh * 60 + em;
      const diffMins =
        endMins >= startMins
          ? endMins - startMins
          : 24 * 60 - startMins + endMins;
      setDuration(formatDuration(diffMins * 60, durationFormat));
      return;
    }

    if (!timerDate) {
      setDuration("");
      return;
    }

    const tick = () => {
      const [h, m] = startTime.split(":").map(Number);
      if (isNaN(h) || isNaN(m)) return;
      const [y, mo, d] = timerDate.split("-").map(Number);
      const start = new Date(y, mo - 1, d, h, m, 0);
      const current = formatDuration(
        Math.floor(Math.max(0, Date.now() - start.getTime()) / 1000),
        durationFormat,
      );

      const orig = originalStartTime.current;
      if (orig && orig !== startTime) {
        const [oh, om] = orig.split(":").map(Number);
        const origStart = new Date(y, mo - 1, d, oh, om, 0);
        const before = formatDuration(
          Math.floor(Math.max(0, Date.now() - origStart.getTime()) / 1000),
          durationFormat,
        );
        setDuration(`${current} (before: ${before})`);
      } else {
        setDuration(current);
      }
    };

    tick();
    const interval = setInterval(tick, 500);
    return () => clearInterval(interval);
  }, [timerDate, startTime, endTime, durationFormat]);

  const { isLoading: dataLoading } = usePromise(
    async (token: string, comp: CompanyResponse) => {
      const timer = new HakunaClient(token);
      const initValues = loadInitialValues
        ? await loadInitialValues(timer)
        : undefined;

      const result = {
        projectsEnabled: comp.projects_enabled,
        projects: [] as Project[],
        tasks: [] as Task[],
        initValues,
      };

      if (comp.projects_enabled) {
        const allProjects = await timer.getProjects();
        result.projects = allProjects.filter((p) => !p.archived);
      } else {
        const allTasks = await timer.getTasks();
        result.tasks = allTasks.filter((t) => !t.archived);
      }

      return result;
    },
    [apiToken, company!],
    {
      execute: !!company,
      onData({
        projectsEnabled: enabled,
        projects: activeProjects,
        tasks: activeTasks,
        initValues,
      }) {
        if (initValues?.startTime) {
          setStartTime(initValues.startTime);
          originalStartTime.current = initValues.startTime;
        }
        if (initValues?.endTime) setEndTime(initValues.endTime);
        if (initValues?.note != null) setNote(initValues.note);

        if (enabled) {
          setProjects(activeProjects);
          const proj =
            (initValues?.projectId
              ? activeProjects.find(
                  (p) => String(p.id) === initValues.projectId,
                )
              : undefined) ?? activeProjects[0];
          if (proj) {
            if (initValues?.taskId) pendingTaskId.current = initValues.taskId;
            setSelectedProjectId(String(proj.id));
            const projTasks = proj.tasks.filter((t) => !t.archived);
            setTasks(projTasks);
            const task =
              (initValues?.taskId
                ? projTasks.find((t) => String(t.id) === initValues.taskId)
                : undefined) ?? projTasks[0];
            if (task) setSelectedTaskId(String(task.id));
          }
        } else {
          setTasks(activeTasks);
          const task =
            (initValues?.taskId
              ? activeTasks.find((t) => String(t.id) === initValues.taskId)
              : undefined) ?? activeTasks[0];
          if (task) setSelectedTaskId(String(task.id));
        }
      },
      onError(error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load data",
          message: error.message,
        });
      },
    },
  );

  const selectedProject = useMemo(() => {
    return projects.find((p) => String(p.id) === selectedProjectId);
  }, [projects, selectedProjectId]);

  const projectBudgetInfo = useMemo(() => {
    if (selectedProject?.budget) {
      return `Budget: ${selectedProject.budget}${selectedProject.budget_is_monthly ? " 🔄" : ""}`;
    }
    return undefined;
  }, [selectedProject]);

  const isLoading = companyLoading || dataLoading;

  useEffect(() => {
    if (!isLoading) {
      firstFieldRef.current?.focus();
    }
  }, [isLoading]);

  function handleProjectChange(projectId: string) {
    setSelectedProjectId(projectId);
    const project = projects.find((p) => String(p.id) === projectId);
    if (project) {
      const activeTasks = project.tasks.filter((t) => !t.archived);
      setTasks(activeTasks);
      const pending = pendingTaskId.current;
      pendingTaskId.current = null;
      const match = pending
        ? activeTasks.find((t) => String(t.id) === pending)
        : undefined;
      setSelectedTaskId(
        match
          ? String(match.id)
          : activeTasks.length > 0
            ? String(activeTasks[0].id)
            : "",
      );
    }
  }

  const [formErrors, setFormErrors] = useState<
    Record<string, string | undefined>
  >({});

  const computedSubmitTitle = useMemo(() => {
    if (endTime) return "Save Entry";
    if (mode === "entry") return "Start Timer";
    return timerDate ? "Update Timer" : "Start Timer";
  }, [endTime, mode, timerDate]);
  const submitTitle = submitLabel ?? computedSubmitTitle;

  async function handleSubmit() {
    const errors: Record<string, string> = {};
    if (projectsEnabled && !selectedProjectId)
      errors.projectId = "Project is required";
    if (!selectedTaskId) errors.taskId = "Task is required";
    if (!startTime) {
      errors.startTime = "Start time is required";
    } else if (!parseTime(startTime)) {
      errors.startTime = "Invalid time (e.g. 09:30)";
    }
    if (endTimeRequired && !endTime) {
      errors.endTime = "End time is required";
    } else if (endTime && !parseTime(endTime)) {
      const m = parseInt(
        endTime.trim().replace(/[.,;]/g, ":").split(":")[1] ?? "",
        10,
      );
      errors.endTime =
        !isNaN(m) && m > 60
          ? "Minutes cannot exceed 60"
          : "Invalid time (e.g. 17:30)";
    }
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});
    await onSubmit({
      taskId: selectedTaskId,
      projectId: projectsEnabled ? selectedProjectId || undefined : undefined,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      note,
    });
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={submitTitle} onSubmit={handleSubmit} />
          {extraActions}
        </ActionPanel>
      }
    >
      {projectsEnabled && (
        <Form.Dropdown
          id="projectId"
          title="Project"
          ref={firstFieldRef}
          storeValue={true}
          value={selectedProjectId}
          onChange={handleProjectChange}
          info={projectBudgetInfo}
          error={formErrors.projectId}
        >
          {projects.map((p) => {
            const prefix = p.code ? `[${p.code}] ` : "";
            const suffix = p.client ? ` (${p.client})` : "";
            return (
              <Form.Dropdown.Item
                key={p.id}
                value={String(p.id)}
                title={`${prefix}${p.name}${suffix}`}
              />
            );
          })}
        </Form.Dropdown>
      )}
      <Form.Dropdown
        id="taskId"
        title="Task"
        ref={projectsEnabled ? undefined : firstFieldRef}
        storeValue={true}
        value={selectedTaskId}
        onChange={setSelectedTaskId}
        error={formErrors.taskId}
      >
        {tasks.map((t) => (
          <Form.Dropdown.Item key={t.id} value={String(t.id)} title={t.name} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="startTime"
        title="Start Time"
        placeholder="HH:MM"
        value={startTime}
        onChange={setStartTime}
        onBlur={() => {
          const normalized = parseTime(startTime);
          if (normalized) setStartTime(normalized);
        }}
        error={formErrors.startTime}
      />
      <Form.TextField
        id="endTime"
        title="End Time"
        placeholder="HH:MM (optional)"
        value={endTime}
        onChange={setEndTime}
        onBlur={() => {
          const normalized = parseTime(endTime);
          if (normalized) setEndTime(normalized);
        }}
        error={formErrors.endTime}
      />
      {duration && <Form.Description title="Duration" text={duration} />}
      <Form.TextArea
        id="note"
        title="Notes"
        placeholder="Optional"
        value={note}
        onChange={setNote}
      />
    </Form>
  );
}
