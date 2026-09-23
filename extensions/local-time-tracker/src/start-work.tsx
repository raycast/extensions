import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  LaunchType,
  Toast,
  launchCommand,
  showHUD,
  showToast,
} from "@raycast/api";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { getRecentDescriptions } from "./lib/descriptions";
import { getCategoryIcon } from "./lib/categories";
import { formatDuration, getDurationSeconds } from "./lib/duration";
import { showFailure } from "./lib/errors";
import { findProject, sortProjectsByPreference } from "./lib/projects";
import { getActiveTimer, getProjectCategories, getProjects, getWorkLogs } from "./lib/storage";
import { ActiveTimerExistsError, startTimer, stopTimer } from "./lib/timer";
import type { ActiveTimer, Project, ProjectCategory, WorkLog } from "./lib/types";

const NO_DESCRIPTION = "__no_description__";
const NEW_DESCRIPTION = "__new_description__";

export default function StartWorkCommand() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<ProjectCategory[]>([]);
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [descriptionChoice, setDescriptionChoice] = useState(NO_DESCRIPTION);
  const [newDescription, setNewDescription] = useState("");
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

  if (activeTimer) {
    const project = findProject(projects, activeTimer.projectId);
    let elapsed = "-";
    try {
      elapsed = formatDuration(getDurationSeconds(activeTimer.startedAt, new Date()));
    } catch {
      // The metadata below still exposes the invalid start time for recovery.
    }

    return (
      <Detail
        markdown={`# Timer Already Running\n\n**${project?.name ?? "Unknown Project"}**${activeTimer.description ? `\n\n${activeTimer.description}` : ""}`}
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
                  } else {
                    await showHUD(`Stopped: ${formatDuration(result.durationSeconds)}`);
                  }
                  setActiveTimer(null);
                } catch (error) {
                  await showFailure("Failed to stop timer", error);
                }
              }}
            />
            <Action
              title="Open Work Logs"
              icon={Icon.List}
              onAction={() => launchCommand({ name: "work-logs", type: LaunchType.UserInitiated })}
            />
          </ActionPanel>
        }
      />
    );
  }

  if (activeProjects.length === 0) {
    return (
      <Detail
        markdown="# No Projects Yet\n\nAdd an active project before starting a timer."
        actions={
          <ActionPanel>
            <Action
              title="Open Projects"
              icon={Icon.Folder}
              onAction={() => launchCommand({ name: "projects", type: LaunchType.UserInitiated })}
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
      await startTimer(project.id, description);
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
                icon={getCategoryIcon(category.id)}
              />
            ))}
          </Form.Dropdown.Section>
        ) : null;
      })}
    </Form.Dropdown>
  );
}
