import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  LaunchType,
  Toast,
  launchCommand,
  closeMainWindow,
  type LaunchProps,
  showHUD,
  showToast,
} from "@raycast/api";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { getRecentDescriptions } from "./lib/descriptions";
import { getCategoryIcon } from "./lib/categories";
import { launchWithFailure } from "./lib/command-actions";
import { formatDuration, getDurationSeconds } from "./lib/duration";
import { showFailure } from "./lib/errors";
import { findProject, sortProjectsByPreference } from "./lib/projects";
import { getActiveTimer, getProjectCategories, getProjects, getWorkLogs } from "./lib/storage";
import { ActiveTimerExistsError, startTimer, stopTimer } from "./lib/timer";
import { getPomodoro, getReminderSettings, startPomodoroInterval } from "./lib/reminder-service";
import { isIntervalFinished, nextPhase, phaseLabel, type PomodoroState } from "./lib/reminders";
import type { ActiveTimer, Project, ProjectCategory, WorkLog } from "./lib/types";

const NO_DESCRIPTION = "__no_description__";
const NEW_DESCRIPTION = "__new_description__";

export default function StartWorkCommand({
  launchContext,
}: LaunchProps<{ launchContext: { pomodoroIntervalId?: string } }>) {
  const [finishedPomodoro, setFinishedPomodoro] = useState<PomodoroState | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<ProjectCategory[]>([]);
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [descriptionChoice, setDescriptionChoice] = useState(NO_DESCRIPTION);
  const [newDescription, setNewDescription] = useState("");
  const [usePomodoro, setUsePomodoro] = useState(false);
  const pomodoroEnabled = getReminderSettings().pomodoroEnabled;
  const projectDropdownRef = useRef<Form.Dropdown>(null);

  async function load() {
    try {
      const [savedProjects, savedCategories, savedLogs, savedTimer] = await Promise.all([
        getProjects(),
        getProjectCategories(),
        getWorkLogs(),
        getActiveTimer(),
      ]);
      setProjects(savedProjects);
      setCategories(savedCategories);
      setWorkLogs(savedLogs);
      setActiveTimer(savedTimer);
      if (launchContext?.pomodoroIntervalId && pomodoroEnabled) {
        const state = await getPomodoro(savedTimer);
        if (state?.intervalId === launchContext.pomodoroIntervalId && isIntervalFinished(state, new Date())) {
          setFinishedPomodoro(state);
        }
      }
      const firstProject = sortProjectsByPreference(savedProjects.filter((project) => project.isActive))[0];
      setSelectedProjectId(firstProject?.id ?? "");
    } catch (error) {
      await showFailure("Failed to load timer", error);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const activeProjects = useMemo(
    () => sortProjectsByPreference(projects.filter((project) => project.isActive)),
    [projects],
  );
  const recentDescriptions = useMemo(
    () => getRecentDescriptions(workLogs, selectedProjectId),
    [workLogs, selectedProjectId],
  );

  useEffect(() => {
    if (isLoading || activeTimer || activeProjects.length === 0) return;

    const focusTimer = setTimeout(() => projectDropdownRef.current?.focus(), 0);
    return () => clearTimeout(focusTimer);
  }, [activeProjects.length, activeTimer, isLoading, selectedProjectId]);

  if (isLoading) {
    return <Detail isLoading markdown="Loading…" />;
  }

  if (finishedPomodoro && activeTimer) {
    const next = phaseLabel(nextPhase(finishedPomodoro));
    return (
      <Detail
        navigationTitle="Pomodoro Finished"
        markdown={`# 🍅 ${phaseLabel(finishedPomodoro.phase)} Finished\n\n${finishedPomodoro.phase === "work" ? "Time to take a break." : "Your break is over."}\n\n**Next: ${next}**\n\nStart the next interval when you are ready. Work tracking continues while you wait.`}
        actions={
          <ActionPanel>
            <Action
              title={`Start ${next}`}
              icon={Icon.Play}
              onAction={async () => {
                if (isSubmitting) return;
                setIsSubmitting(true);
                try {
                  await startPomodoroInterval(activeTimer.id, finishedPomodoro.intervalId);
                  setFinishedPomodoro(null);
                  await launchCommand({ name: "menu-bar", type: LaunchType.Background });
                  await closeMainWindow();
                } catch (error) {
                  await showFailure("Could not start the next interval", error);
                } finally {
                  setIsSubmitting(false);
                }
              }}
            />
            <Action title="Dismiss" icon={Icon.XMarkCircle} onAction={() => closeMainWindow()} />
          </ActionPanel>
        }
      />
    );
  }

  if (activeTimer) {
    const project = findProject(projects, activeTimer.projectId);
    let elapsed = "-";
    let clockRolledBack = false;
    try {
      elapsed = formatDuration(getDurationSeconds(activeTimer.startedAt, new Date()));
    } catch {
      clockRolledBack = true;
      elapsed = "Clock changed";
    }

    return (
      <Detail
        markdown={`# Timer Already Running\n\n**${project?.name ?? "Unknown Project"}**${activeTimer.description ? `\n\n${activeTimer.description}` : ""}${clockRolledBack ? "\n\nThe system clock is earlier than this timer's start. The timer is preserved; correct the clock before stopping it." : ""}`}
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.Label title="Elapsed" text={elapsed} />
            <Detail.Metadata.Label title="Started" text={new Date(activeTimer.startedAt).toLocaleString()} />
          </Detail.Metadata>
        }
        actions={
          <ActionPanel>
            <Action
              title="Stop Work"
              icon={Icon.Stop}
              onAction={async () => {
                try {
                  const result = await stopTimer();
                  if (result.status === "none") {
                    await showHUD("No active timer");
                    setActiveTimer(null);
                  } else if (result.status === "clock-rollback") {
                    await showToast({
                      style: Toast.Style.Failure,
                      title: "Clock changed",
                      message: "The timer is still running. Correct your Mac clock, then stop it again.",
                    });
                  } else {
                    await showHUD(`Stopped: ${formatDuration(result.durationSeconds)}`);
                    setActiveTimer(null);
                  }
                } catch (error) {
                  await showFailure("Failed to stop timer", error);
                }
              }}
            />
            <Action
              title="Open Work Logs"
              icon={Icon.List}
              onAction={() =>
                launchWithFailure(
                  () => launchCommand({ name: "work-logs", type: LaunchType.UserInitiated }),
                  "Could not open Work Logs",
                  showFailure,
                )
              }
            />
          </ActionPanel>
        }
      />
    );
  }

  if (activeProjects.length === 0) {
    return (
      <Detail
        markdown={"# No Projects Yet\n\nAdd an active project before starting a timer."}
        actions={
          <ActionPanel>
            <Action
              title="Open Projects"
              icon={Icon.Folder}
              onAction={() =>
                launchWithFailure(
                  () => launchCommand({ name: "projects", type: LaunchType.UserInitiated }),
                  "Could not open Projects",
                  showFailure,
                )
              }
            />
          </ActionPanel>
        }
      />
    );
  }

  async function submit() {
    if (isSubmitting) return;

    const description =
      recentDescriptions.length === 0 || descriptionChoice === NEW_DESCRIPTION
        ? newDescription.trim()
        : descriptionChoice === NO_DESCRIPTION
          ? ""
          : descriptionChoice;
    const project = findProject(projects, selectedProjectId);
    if (!project?.isActive) {
      await showToast({ style: Toast.Style.Failure, title: "Select an active project" });
      return;
    }

    setIsSubmitting(true);
    try {
      const startedTimer = await startTimer(project.id, description);
      setActiveTimer(startedTimer);
      if (usePomodoro && pomodoroEnabled) {
        try {
          await startPomodoroInterval(startedTimer.id);
          // Refresh again after the separate pomodoro state has been saved.
          await launchCommand({ name: "menu-bar", type: LaunchType.Background });
        } catch (error) {
          await showFailure("Work started, but Pomodoro could not start", error);
          return;
        }
      }
      await showHUD(`Started: ${project.name}`);
    } catch (error) {
      if (error instanceof ActiveTimerExistsError) {
        const existingProject = findProject(projects, error.activeTimer.projectId);
        await showToast({
          style: Toast.Style.Failure,
          title: "A timer is already running",
          message: error.activeTimer.description
            ? `${existingProject?.name ?? "Unknown Project"}: ${error.activeTimer.description}`
            : (existingProject?.name ?? "Unknown Project"),
        });
        setActiveTimer(error.activeTimer);
      } else {
        await showFailure("Failed to start timer", error);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Start Work" icon={Icon.Play} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <ProjectDropdown
        dropdownRef={projectDropdownRef}
        projects={activeProjects}
        categories={categories}
        value={selectedProjectId}
        onChange={(projectId) => {
          setSelectedProjectId(projectId);
          setDescriptionChoice(NO_DESCRIPTION);
          setNewDescription("");
        }}
      />
      {recentDescriptions.length > 0 ? (
        <>
          <Form.Dropdown id="descriptionChoice" title="Task" value={descriptionChoice} onChange={setDescriptionChoice}>
            <Form.Dropdown.Item value={NO_DESCRIPTION} title="No Description" icon={Icon.Minus} />
            <Form.Dropdown.Section title="RECENT TASKS">
              {recentDescriptions.map((description) => (
                <Form.Dropdown.Item key={description} value={description} title={description} icon={Icon.Text} />
              ))}
            </Form.Dropdown.Section>
            <Form.Dropdown.Item value={NEW_DESCRIPTION} title="Enter New Description…" icon={Icon.Plus} />
          </Form.Dropdown>
          {descriptionChoice === NEW_DESCRIPTION ? (
            <Form.TextField
              id="description"
              title="New Description"
              placeholder="Optional"
              value={newDescription}
              onChange={setNewDescription}
            />
          ) : null}
        </>
      ) : (
        <Form.TextField
          id="description"
          title="Description"
          placeholder="Optional"
          value={newDescription}
          onChange={setNewDescription}
        />
      )}
      {pomodoroEnabled ? (
        <Form.Checkbox
          id="pomodoro"
          title="Pomodoro"
          label="Use Pomodoro alongside work tracking"
          value={usePomodoro}
          onChange={setUsePomodoro}
        />
      ) : null}
    </Form>
  );
}

function ProjectDropdown({
  dropdownRef,
  projects,
  categories,
  value,
  onChange,
}: {
  dropdownRef: RefObject<Form.Dropdown | null>;
  projects: Project[];
  categories: ProjectCategory[];
  value: string;
  onChange: (projectId: string) => void;
}) {
  const preferredProjects = projects.filter((project) => project.isPreferred);

  return (
    <Form.Dropdown ref={dropdownRef} id="projectId" title="Project" value={value} onChange={onChange} autoFocus>
      {preferredProjects.length > 0 ? (
        <Form.Dropdown.Section title="PREFERRED">
          {preferredProjects.map((project) => (
            <Form.Dropdown.Item key={project.id} value={project.id} title={project.name} icon={Icon.Star} />
          ))}
        </Form.Dropdown.Section>
      ) : null}
      {categories.map((category) => {
        const categoryProjects = projects.filter((project) => project.type === category.id && !project.isPreferred);
        return categoryProjects.length > 0 ? (
          <Form.Dropdown.Section key={category.id} title={category.name.toUpperCase()}>
            {categoryProjects.map((project) => (
              <Form.Dropdown.Item
                key={project.id}
                value={project.id}
                title={project.name}
                icon={getCategoryIcon(categories, category.id)}
              />
            ))}
          </Form.Dropdown.Section>
        ) : null;
      })}
    </Form.Dropdown>
  );
}
