import {
  Form,
  ActionPanel,
  Action,
  Keyboard,
  showToast,
  Toast,
  popToRoot,
  Icon,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { useState, useEffect, useRef, useMemo } from "react";
import { useCachedPromise } from "@raycast/utils";
import {
  ClientStub,
  HakunaClient,
  ProjectResponse,
  TaskResponse,
  CompanyResponse,
  TimerResponse,
} from "./hakuna-api";
import {
  formatDate,
  formatDuration,
  parseDate,
  formatTime,
  compareTime,
  parseTime,
  calculateDurationSeconds,
} from "./duration";

interface Props {
  apiToken: string;

  entryId?: number;
  date?: string;
  projectId?: number;
  taskId?: number;
  startTime?: string;
  endTime?: string;
  note?: string;
  prefillFromLiveTimer?: boolean;
}

function clientName(client?: string | ClientStub): string | undefined {
  if (client === undefined || client === null) {
    return undefined;
  }

  return typeof client === "object" ? client.name : client;
}

function isToday(date: Date | null | undefined): boolean {
  if (!date) return false;
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

export default function TimerForm({
  apiToken,

  entryId: initialEntryId,
  date: initialDate,
  projectId: initialProjectId,
  taskId: initialTaskId,
  startTime: initialStartTime,
  endTime: initialEndTime,
  note: initialNote,
  prefillFromLiveTimer = true,
}: Props) {
  const client = new HakunaClient(apiToken);

  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [tasks, setTasks] = useState<TaskResponse[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState(
    initialProjectId ? String(initialProjectId) : "",
  );
  const [selectedTaskId, setSelectedTaskId] = useState(
    initialTaskId ? String(initialTaskId) : "",
  );

  const [startTime, setStartTime] = useState(
    (initialStartTime ? formatTime(initialStartTime) : null) ?? "",
  );
  const [endTime, setEndTime] = useState(
    (initialEndTime ? formatTime(initialEndTime) : null) ?? "",
  );
  const [note, setNote] = useState(initialNote ?? "");
  const [date, setDate] = useState<Date | null>(
    parseDate(initialDate) ?? new Date(),
  );
  const [duration, setDuration] = useState("");

  const [projectTaskHistory, setProjectTaskHistory] = useState<
    Record<number, number>
  >(
    initialProjectId && initialTaskId
      ? { [initialProjectId]: initialTaskId }
      : {},
  );

  const firstFieldRef = useRef<Form.ItemReference>(null);
  const appliedLiveTimer = useRef(false);
  const editingBaseline = useRef({
    projectId: initialProjectId,
    taskId: initialTaskId,
    startTime: initialStartTime,
  });

  function applyLiveTimerPrefill(
    activeProjects: ProjectResponse[],
    activeTasks: TaskResponse[],
    withProjects: boolean,
  ) {
    if (!timer) {
      return;
    }

    appliedLiveTimer.current = true;
    editingBaseline.current = {
      projectId: timer.project?.id,
      taskId: timer.task?.id,
      startTime: timer.start_time,
    };

    if (timer.start_time) {
      setStartTime(formatTime(timer.start_time) ?? "");
    }
    if (timer.note) {
      setNote(timer.note);
    }

    if (withProjects) {
      setProjects(activeProjects);
      const selectedProject = timer.project?.id
        ? activeProjects.find((p) => p.id === timer.project?.id)
        : undefined;
      if (!selectedProject) {
        return;
      }

      setSelectedProjectId(String(selectedProject.id));
      const activeProjectTasks = selectedProject.tasks.filter(
        (t) => !t.archived,
      );
      setTasks(activeProjectTasks);

      const taskId = timer.task?.id;
      const task = taskId
        ? activeProjectTasks.find((t) => t.id === taskId)
        : activeProjectTasks[0];
      if (task) {
        setSelectedTaskId(String(task.id));
      }
      return;
    }

    setTasks(activeTasks);
    const taskId = timer.task?.id;
    const task = taskId
      ? activeTasks.find((t) => t.id === taskId)
      : activeTasks[0];
    if (task) {
      setSelectedTaskId(String(task.id));
    }
  }

  const {
    data: timer,
    isLoading: isLoadingTimer,
    mutate: mutateTimer,
  } = useCachedPromise(async () => {
    return await client.getTimer();
  });

  const {
    data: company,
    isLoading: isLoadingCompany,
    mutate: mutateCompany,
  } = useCachedPromise(async () => {
    return await client.getCompany();
  });

  const {
    data: lastEntryEndTime,
    isLoading: isLoadingEntries,
    mutate: mutateEntries,
  } = useCachedPromise(async () => {
    const entries = await client.getTimeEntries(
      formatDate(date ?? new Date())!,
    );

    const sortedEntries = entries?.sort((a, b) =>
      compareTime(parseTime(a.end_time), parseTime(b.end_time)),
    );

    if (!sortedEntries.length) {
      return null;
    }

    const endTime = sortedEntries[sortedEntries.length - 1].end_time;
    if (!endTime) {
      return null;
    }

    return endTime;
  });

  const projectsEnabled = company?.projects_enabled ?? false;
  const durationFormat = company?.duration_format ?? "hhmm";

  useEffect(() => {
    if (!startTime && lastEntryEndTime) {
      setStartTime(lastEntryEndTime);
    }
  }, [lastEntryEndTime]);

  useEffect(() => {
    const pStart = formatTime(startTime);
    const pEnd = formatTime(endTime);

    if (!pStart) {
      setDuration("");
      return;
    }

    if (pEnd) {
      const diffSeconds = calculateDurationSeconds(pStart, pEnd);
      setDuration(formatDuration(diffSeconds, durationFormat));
      return;
    }

    const { hours: start_h, minutes: start_m } = parseTime(pStart)!;
    const tick = () => {
      const now = new Date();
      const now_h = now.getHours();
      const now_m = now.getMinutes();
      if (start_h > now_h || (start_h == now_h && start_m > now_m)) {
        // start is in the future
        setDuration("");
        return;
      }

      const diffSeconds = calculateDurationSeconds(pStart, formatTime(now)!);
      setDuration(formatDuration(diffSeconds, durationFormat));
    };

    tick();
    const interval = setInterval(tick, 900);
    return () => clearInterval(interval);
  }, [timer, startTime, endTime, durationFormat]);

  const { isLoading: isProjectsOrTasksLoading, mutate: mutateProjectsOrTasks } =
    useCachedPromise(
      async (comp: CompanyResponse) => {
        const result = {
          projectsEnabled: comp.projects_enabled,
          projects: [] as ProjectResponse[],
          tasks: [] as TaskResponse[],
        };

        if (comp.projects_enabled) {
          const allProjects = await client.getProjects();
          result.projects = allProjects.filter((p) => !p.archived);
        } else {
          const allTasks = await client.getTasks();
          result.tasks = allTasks.filter((t) => !t.archived);
        }

        return result;
      },
      [company!],
      {
        execute: !!company,
        onData({
          projectsEnabled,
          projects: activeProjects,
          tasks: activeTasks,
        }) {
          if (prefillFromLiveTimer && timer) {
            applyLiveTimerPrefill(activeProjects, activeTasks, projectsEnabled);
            firstFieldRef.current?.focus();
            return;
          }

          if (!projectsEnabled) {
            setTasks(activeTasks);
            const task =
              (initialTaskId
                ? activeTasks.find((t) => t.id === initialTaskId)
                : undefined) ?? activeTasks[0];
            if (task) setSelectedTaskId(String(task.id));
            return;
          }

          if (!activeProjects?.length) {
            return;
          }

          setProjects(activeProjects);
          const selectedProject = initialProjectId
            ? activeProjects.find((p) => p.id === initialProjectId)
            : undefined;

          if (!selectedProject) {
            const fallbackProject = activeProjects[0];
            setSelectedProjectId(String(fallbackProject.id));
            const activeProjectTasks = fallbackProject.tasks.filter(
              (t) => !t.archived,
            );
            setTasks(activeProjectTasks);

            const fallbackTask = activeProjectTasks[0];
            if (fallbackTask) {
              setSelectedTaskId(String(fallbackTask.id));
            }

            return;
          }

          setSelectedProjectId(String(selectedProject.id));
          const activeProjectTasks = selectedProject.tasks.filter(
            (t) => !t.archived,
          );
          setTasks(activeProjectTasks);

          const initialProjectTask =
            (initialTaskId
              ? activeProjectTasks.find((t) => t.id == initialTaskId)
              : undefined) ?? activeProjectTasks[0];
          if (initialProjectTask) {
            setSelectedTaskId(String(initialProjectTask.id));
          }

          firstFieldRef.current?.focus();
        },
        onError(error) {
          showToast({
            style: Toast.Style.Failure,
            title: `Failed to load ${projectsEnabled ? "projects" : "tasks"}`,
            message: error.message,
          });
        },
      },
    );

  useEffect(() => {
    if (!prefillFromLiveTimer || appliedLiveTimer.current) {
      return;
    }
    if (isLoadingTimer || isLoadingCompany || isProjectsOrTasksLoading) {
      return;
    }

    if (!timer) {
      appliedLiveTimer.current = true;
      return;
    }

    if (projectsEnabled && projects.length === 0) {
      return;
    }

    applyLiveTimerPrefill(projects, tasks, projectsEnabled);
  }, [
    prefillFromLiveTimer,
    timer,
    isLoadingTimer,
    isLoadingCompany,
    isProjectsOrTasksLoading,
    projects,
    tasks,
    projectsEnabled,
  ]);

  const refreshAll = () => {
    mutateTimer();
    mutateCompany();
    mutateProjectsOrTasks();
    mutateEntries();
  };

  const isLoading =
    isLoadingTimer ||
    isLoadingCompany ||
    isProjectsOrTasksLoading ||
    isLoadingEntries;

  const selectedProject = useMemo(() => {
    return projects.find((p) => String(p.id) === selectedProjectId);
  }, [projects, selectedProjectId]);

  const projectBudgetInfo = useMemo(() => {
    if (selectedProject?.budget) {
      return `Budget: ${selectedProject.budget}${selectedProject.budget_is_monthly ? " 🔄" : ""}`;
    }
    return undefined;
  }, [selectedProject]);

  function handleProjectChange(projectId: string) {
    setProjectTaskHistory({
      ...projectTaskHistory,
      [selectedProjectId]: selectedTaskId,
    });

    const projectIdNr = Number(projectId);

    setSelectedProjectId(projectId);
    const project = projects.find((p) => p.id === projectIdNr);
    if (!project) {
      setTasks([]);
      return;
    }

    const activeTasks = project.tasks.filter((t) => !t.archived);
    setTasks(activeTasks);
    if (!activeTasks?.length) {
      return;
    }

    const historicTaskId =
      projectId in projectTaskHistory
        ? projectTaskHistory[projectIdNr]
        : initialProjectId === projectIdNr
          ? initialTaskId
          : undefined;

    if (historicTaskId && activeTasks.find((t) => t.id === historicTaskId)) {
      setSelectedTaskId(String(projectTaskHistory[projectIdNr]));
      return;
    }

    setSelectedTaskId(String(activeTasks[0].id));
    return;
  }

  const [formErrors, setFormErrors] = useState<
    Record<string, string | undefined>
  >({});

  const submitTitle = useMemo(() => {
    if (endTime && initialEntryId) return "Update Entry";
    if (endTime && timer) return "End Timer";
    if (endTime) return "Create Entry";

    if (timer) return "Update Timer";
    return "Start Timer";
  }, [endTime, initialEntryId, timer]);

  function editingCurrentTimer() {
    const baseline = editingBaseline.current;
    return (
      timer &&
      baseline.taskId === timer.task?.id &&
      baseline.startTime === timer.start_time &&
      (projectsEnabled ? timer.project?.id === baseline.projectId : true)
    );
  }

  function validate() {
    const errors: Record<string, string> = {};
    if (projectsEnabled && !selectedProjectId)
      errors.projectId = "Project is required";
    if (!selectedTaskId) errors.taskId = "Task is required";
    if (!startTime) {
      errors.startTime = "Start time is required";
    } else if (!formatTime(startTime)) {
      errors.startTime = "Invalid time (e.g. 09:30)";
    } else if (
      lastEntryEndTime &&
      !endTime &&
      compareTime(parseTime(startTime), parseTime(lastEntryEndTime)) < 0
    ) {
      errors.startTime = `Overlap, previous ends ${lastEntryEndTime}`;
    }
    if (endTime && !formatTime(endTime)) {
      errors.endTime = "Invalid time (e.g. 17:45)";
    }
    if (timer && !errors.startTime && !errors.endTime) {
      const timerStart = formatTime(timer.start_time.slice(0, 5));
      if (timerStart) {
        const [th, tm] = timerStart.split(":").map(Number);
        const timerStartMins = th * 60 + tm;
        const pStart = formatTime(startTime);
        if (!editingCurrentTimer() && pStart) {
          const [sh, sm] = pStart.split(":").map(Number);
          if (sh * 60 + sm >= timerStartMins) {
            errors.startTime = `Must be before running timer (started ${timerStart})`;
          }
        }
        if (!errors.startTime) {
          const pEnd = formatTime(endTime);
          if (pEnd && !editingCurrentTimer()) {
            const [eh, em] = pEnd.split(":").map(Number);
            if (eh * 60 + em > timerStartMins) {
              errors.endTime = `Must end by ${timerStart} (timer is running)`;
            }
          }
        }
      }
    }
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return false;
    }
    setFormErrors({});
    return true;
  }

  async function handleSubmit() {
    if (!validate()) {
      return;
    }

    try {
      await submitTimerForm();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to save",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function submitTimerForm() {
    const formattedStartTime = formatTime(startTime)!;
    setStartTime(formattedStartTime);
    const formattedEndTime = formatTime(endTime) ?? "";
    setEndTime(formattedEndTime);
    const formattedDate = formatDate(date ?? new Date())!;

    if (endTime) {
      if (initialEntryId) {
        // "Update Entry"
        await client.updateTimeEntry(
          initialEntryId,
          Number(selectedTaskId),
          projectsEnabled ? Number(selectedProjectId) : undefined,
          formattedDate,
          formattedStartTime,
          formattedEndTime,
          note,
        );
        await showToast({ style: Toast.Style.Success, title: "Entry Updated" });
        popToRoot();
        return;
      }

      if (timer) {
        // "End Timer" — stopTimer atomically creates an entry, then adjust times
        const stopped = await client.stopTimer();
        try {
          await client.updateTimeEntry(
            stopped.id,
            Number(selectedTaskId),
            projectsEnabled ? Number(selectedProjectId) : undefined,
            formattedDate,
            formattedStartTime,
            formattedEndTime,
            note,
          );
        } catch (error) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Timer stopped",
            message: `${error instanceof Error ? error.message : "Unknown error"}. A time entry was created — adjust it in Hakuna.`,
          });
          popToRoot();
          return;
        }
        await showToast({ style: Toast.Style.Success, title: "Entry Created" });
        popToRoot();
        return;
      }

      // "Create Entry"
      await client.createTimeEntry(
        Number(selectedTaskId),
        projectsEnabled ? Number(selectedProjectId) : undefined,
        formattedDate,
        formattedStartTime,
        formattedEndTime,
        note,
      );
      await showToast({ style: Toast.Style.Success, title: "Entry Created" });
      popToRoot();
      return;
    }

    const previousTimer: TimerResponse | null | undefined = timer;
    if (previousTimer) {
      await client.deleteTimer();
    }

    try {
      if (startTime && !isToday(date)) {
        await client.createTimeEntry(
          Number(selectedTaskId),
          projectsEnabled ? Number(selectedProjectId) : undefined,
          formattedDate,
          formattedStartTime,
          null,
          note,
        );
      } else {
        await client.startTimer(
          Number(selectedTaskId),
          projectsEnabled ? Number(selectedProjectId) : undefined,
          formattedStartTime,
          note,
        );
      }
    } catch (error) {
      if (previousTimer?.task?.id) {
        try {
          await client.startTimer(
            previousTimer.task.id,
            previousTimer.project?.id,
            formatTime(previousTimer.start_time) ?? previousTimer.start_time,
            previousTimer.note,
          );
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to update timer",
            message: `${error instanceof Error ? error.message : "Unknown error"}. Your previous timer was restored.`,
          });
          return;
        } catch {
          // fall through to generic error below
        }
      }
      throw error;
    }

    if (previousTimer) {
      await showToast({ style: Toast.Style.Success, title: "Timer Updated" });
    } else {
      await showToast({ style: Toast.Style.Success, title: "Timer Started" });
    }
    popToRoot();
    return;
  }

  return (
    <Form
      isLoading={isLoading}
      searchBarAccessory={
        <Form.LinkAccessory
          target="https://app.hakuna.ch"
          text="Open In Browser"
        />
      }
      actions={
        <ActionPanel>
          <Action.SubmitForm title={submitTitle} onSubmit={handleSubmit} />
          <Action
            title="Refresh"
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={refreshAll}
          />
          <Action.OpenInBrowser
            title="Open in Browser"
            url="https://app.hakuna.ch"
            shortcut={Keyboard.Shortcut.Common.Open}
          />
          {timer && (
            <>
              <Action
                title="Stop Timer"
                icon={Icon.Stop}
                shortcut={{
                  macOS: { modifiers: ["cmd"], key: "backspace" },
                  Windows: { modifiers: ["ctrl"], key: "delete" },
                }}
                onAction={async () => {
                  const stopped = await client.stopTimer();
                  await showToast({
                    style: Toast.Style.Success,
                    title: `Timer stopped at ${stopped.end_time} after ${stopped.duration}`,
                  });
                  popToRoot();
                }}
              />
              <Action
                title="Cancel Timer"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{
                  macOS: { modifiers: ["cmd", "shift"], key: "backspace" },
                  Windows: { modifiers: ["ctrl", "shift"], key: "delete" },
                }}
                onAction={async () => {
                  const confirmed = await confirmAlert({
                    title: "Cancel Timer",
                    message:
                      "Please confirm to cancel the current timer. This cannot be undone.",
                    primaryAction: {
                      title: "Cancel Timer",
                      style: Alert.ActionStyle.Destructive,
                    },
                  });
                  if (!confirmed) return;
                  await client.deleteTimer();
                  await showToast({
                    style: Toast.Style.Success,
                    title: "Timer cancelled",
                  });
                  popToRoot();
                }}
              />
            </>
          )}
        </ActionPanel>
      }
    >
      {projectsEnabled && (
        <Form.Dropdown
          id="projectId"
          title="Project"
          ref={firstFieldRef}
          value={projects.length && selectedProjectId ? selectedProjectId : ""}
          onChange={handleProjectChange}
          info={projectBudgetInfo}
          error={formErrors.projectId}
        >
          {projects.map((p) => {
            const prefix = p.code ? `[${p.code}] ` : "";
            const name = clientName(p.client);
            const suffix = name ? ` (${name})` : "";
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
        value={tasks.length && selectedTaskId ? selectedTaskId : ""}
        onChange={setSelectedTaskId}
        error={formErrors.taskId}
      >
        {tasks.map((t) => (
          <Form.Dropdown.Item key={t.id} value={String(t.id)} title={t.name} />
        ))}
      </Form.Dropdown>
      <Form.Separator />
      <Form.DatePicker
        id="date"
        title="Date"
        value={date}
        onChange={setDate}
        onBlur={() => {
          setDate(date ?? new Date());
        }}
        error={formErrors.date}
        type={Form.DatePicker.Type.Date}
      />
      <Form.TextField
        id="startTime"
        title="Start Time"
        placeholder="HH:MM"
        value={startTime}
        onChange={setStartTime}
        onBlur={() => {
          const normalized = formatTime(startTime);
          if (normalized) setStartTime(normalized);
        }}
        error={formErrors.startTime}
        info={lastEntryEndTime ? `End of last: ${lastEntryEndTime}` : undefined}
      />
      <Form.TextField
        id="endTime"
        title="End Time"
        placeholder="HH:MM (optional)"
        value={endTime}
        onChange={setEndTime}
        onBlur={() => {
          const normalized = formatTime(endTime);
          if (normalized) setEndTime(normalized);
        }}
        error={formErrors.endTime}
      />
      {duration && <Form.Description title="Duration" text={duration} />}
      <Form.Separator />
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
