import { Action, ActionPanel, Detail, Form, Icon, Toast, popToRoot, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ApiError,
  Project,
  Task,
  completeTask,
  getInboxTasks,
  getProjectIcon,
  getProjectIndent,
  getProjectTasks,
  getProjects,
  getNote,
  getTasks,
  getTasksForToday,
  withErrorHandling,
} from "./api";
import TaskUpdater from "./components/TaskUpdater";
import { ErrorView } from "./components/TaskList";
import { parseNoteContent } from "./utils/delta-to-markdown";
import { getPriorityConfig } from "./utils/priorities";

type Bucket =
  | { type: "today"; title: string }
  | { type: "inbox"; title: string }
  | { type: "random"; title: string }
  | { type: "project"; title: string; projectId: string };

type TaskWithUnknownProperties = Task & Record<string, unknown>;

const RECURRENCE_MARKER_KEYS = [
  "recurrence",
  "recurrenceRule",
  "recurrenceId",
  "recurring",
  "regular",
  "regularId",
  "regularTaskId",
  "repeat",
  "repeatRule",
  "repeatType",
  "rrule",
];

function isCompleted(task: Task): boolean {
  return task.checked === 1 || task.complete === 1;
}

function isRepetitiveTask(task: Task): boolean {
  const rawTask = task as TaskWithUnknownProperties;

  return RECURRENCE_MARKER_KEYS.some((key) => {
    const value = rawTask[key];
    if (value === undefined || value === null || value === false || value === "" || value === 0) return false;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "object") return Object.keys(value).length > 0;
    return true;
  });
}

function getEligibleTasks(tasks: Task[]): Task[] {
  return tasks.filter((task) => !task.removed && !isCompleted(task) && !isRepetitiveTask(task));
}

function pickRandomTask(tasks: Task[], previousTaskId?: string): Task | null {
  if (tasks.length === 0) return null;

  const candidates = tasks.length > 1 ? tasks.filter((task) => task.id !== previousTaskId) : tasks;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

async function loadTasksForBucket(bucket: Bucket): Promise<Task[]> {
  if (bucket.type === "today") return getTasksForToday();
  if (bucket.type === "inbox") return getInboxTasks();
  if (bucket.type === "project") return getProjectTasks(bucket.projectId);

  return getTasks({
    includeRemoved: false,
    includeArchived: false,
  });
}

function formatDateTime(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  return new Date(value).toLocaleString();
}

function formatProject(project: Project | undefined): string {
  return project?.title ?? "Inbox";
}

function buildTaskMarkdown(task: Task, noteDisplay: string): string {
  return `# ${task.title || "(Untitled task)"}\n\n${noteDisplay}`;
}

function BucketPicker({
  projects,
  isLoading,
  onPick,
}: {
  projects: Project[];
  isLoading: boolean;
  onPick: (bucket: Bucket) => void;
}) {
  const [bucketId, setBucketId] = useState("today");

  function handleSubmit() {
    const project = projects.find((item) => `project:${item.id}` === bucketId);
    if (project) {
      onPick({ type: "project", title: project.title, projectId: project.id });
      return;
    }

    if (bucketId === "inbox") {
      onPick({ type: "inbox", title: "Inbox" });
    } else if (bucketId === "random") {
      onPick({ type: "random", title: "Random" });
    } else {
      onPick({ type: "today", title: "Today" });
    }
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Zen Mode"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Start Zen Mode" icon={Icon.Play} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Long task lists can create choice overload and make it hard to decide where to start. Zen Mode removes that decision: pick a bucket and it will show one random active non-repeating task. Complete it, skip it by changing the title, or exit when you are done. Random includes every project and Inbox." />

      <Form.Dropdown id="bucket" title="Bucket" value={bucketId} onChange={setBucketId}>
        <Form.Dropdown.Item value="today" title="Today" icon={Icon.Calendar} />
        <Form.Dropdown.Item value="inbox" title="Inbox" icon={Icon.Tray} />
        <Form.Dropdown.Item value="random" title="Random" icon={Icon.Shuffle} />
        {projects.length > 0 ? (
          <Form.Dropdown.Section title="Projects">
            {projects.map((project) => (
              <Form.Dropdown.Item
                key={project.id}
                value={`project:${project.id}`}
                title={`${getProjectIndent(project)}${getProjectIcon(project, true).source}  ${project.title}`}
              />
            ))}
          </Form.Dropdown.Section>
        ) : null}
      </Form.Dropdown>
    </Form>
  );
}

function ZenTaskView({
  bucket,
  task,
  projects,
  projectsMap,
  remainingTaskCount,
  isLoading,
  onComplete,
  onSkip,
  onTaskUpdated,
}: {
  bucket: Bucket;
  task: Task | null;
  projects: Project[];
  projectsMap: Record<string, Project>;
  remainingTaskCount: number;
  isLoading: boolean;
  onComplete: () => Promise<void>;
  onSkip: () => void;
  onTaskUpdated: () => void;
}) {
  const project = task?.projectId ? projectsMap[task.projectId] : undefined;
  const priority = getPriorityConfig(task?.priority ?? 1);
  const [noteContent, setNoteContent] = useState<string | null>(null);
  const [isLoadingNote, setIsLoadingNote] = useState(false);
  const isNoteId = task?.note && /^N-[A-Z]-[a-f0-9-]+$/i.test(task.note);

  useEffect(() => {
    let cancelled = false;

    async function fetchNoteContent() {
      setNoteContent(null);
      setIsLoadingNote(false);

      if (isNoteId && task?.note) {
        setIsLoadingNote(true);
        const note = await getNote(task.note);
        if (!cancelled && note) {
          const content = note.text || note.content || (typeof note.delta === "string" ? note.delta : null);
          setNoteContent(content);
        }
        if (!cancelled) setIsLoadingNote(false);
      }
    }

    fetchNoteContent();

    return () => {
      cancelled = true;
    };
  }, [task?.note, isNoteId]);

  if (!task) {
    return (
      <Detail
        navigationTitle={`Zen Mode: ${bucket.title}`}
        isLoading={isLoading}
        markdown={
          isLoading
            ? "# Loading task..."
            : `# No eligible tasks\n\nNo active non-repeating tasks were found in ${bucket.title}.`
        }
        actions={
          <ActionPanel>
            <Action title="Exit Zen Mode" icon={Icon.XMarkCircle} onAction={popToRoot} />
          </ActionPanel>
        }
      />
    );
  }

  let noteDisplay = "";
  if (isLoadingNote) {
    noteDisplay = "*Loading note...*";
  } else if (noteContent) {
    noteDisplay = parseNoteContent(noteContent);
  } else if (task.note && !isNoteId) {
    noteDisplay = parseNoteContent(task.note);
  }

  return (
    <Detail
      navigationTitle={`Zen Mode: ${bucket.title}`}
      isLoading={isLoading || isLoadingNote}
      markdown={buildTaskMarkdown(task, noteDisplay)}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Project"
            text={formatProject(project)}
            icon={project ? getProjectIcon(project) : Icon.Tray}
          />
          <Detail.Metadata.Label
            title="Priority"
            text={priority.name}
            icon={{ source: priority.icon, tintColor: priority.color }}
          />
          <Detail.Metadata.Label title="Start" text={formatDateTime(task.start, "Not set")} icon={Icon.Calendar} />
          <Detail.Metadata.Label title="Deadline" text={formatDateTime(task.deadline, "Not set")} icon={Icon.Flag} />
          <Detail.Metadata.Label title="Remaining in Bucket" text={`${remainingTaskCount}`} icon={Icon.List} />
          {task.tags && task.tags.length > 0 ? (
            <Detail.Metadata.TagList title="Tags">
              {task.tags.map((tag, index) => (
                <Detail.Metadata.TagList.Item key={index} text={tag} />
              ))}
            </Detail.Metadata.TagList>
          ) : null}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action title="Complete Task" icon={Icon.Checkmark} onAction={onComplete} />
          <Action.Push
            title="Skip Task"
            icon={Icon.Forward}
            target={
              <TaskUpdater
                task={task}
                projects={projects}
                onTaskUpdated={onSkip}
                requireTitleChange
                guidance="To skip this task, update its title first. Other properties can be edited here too."
                submitTitle="Update and Skip"
                successTitle="Task Skipped"
              />
            }
          />
          <Action title="Exit Zen Mode" icon={Icon.XMarkCircle} onAction={popToRoot} />
          <ActionPanel.Section>
            <Action.Push
              title="Edit Task"
              icon={Icon.Pencil}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
              target={<TaskUpdater task={task} projects={projects} onTaskUpdated={onTaskUpdated} />}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [bucket, setBucket] = useState<Bucket | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [task, setTask] = useState<Task | null>(null);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [hasLoadedBucketTasks, setHasLoadedBucketTasks] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const projectsMap = useMemo(() => Object.fromEntries(projects.map((project) => [project.id, project])), [projects]);

  const rollTask = useCallback((taskPool: Task[], previousTaskId?: string) => {
    setTask(pickRandomTask(getEligibleTasks(taskPool), previousTaskId));
  }, []);

  const loadProjects = useCallback(async () => {
    const result = await withErrorHandling(() => getProjects(), "Failed to load projects", { showDetails: true });
    if (result) setProjects(result);
    setIsLoadingProjects(false);
  }, []);

  const loadBucketTasks = useCallback(
    async (selectedBucket: Bucket, previousTaskId?: string) => {
      setIsLoadingTasks(true);
      setError(null);

      try {
        const loadedTasks = await loadTasksForBucket(selectedBucket);
        setTasks(loadedTasks);
        rollTask(loadedTasks, previousTaskId);
      } catch (err) {
        const errorMessage =
          err instanceof ApiError
            ? err.userFriendlyMessage
            : err instanceof Error
              ? err.message
              : "An unexpected error occurred";
        setError(errorMessage);
      } finally {
        setHasLoadedBucketTasks(true);
        setIsLoadingTasks(false);
      }
    },
    [rollTask],
  );

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (bucket) {
      loadBucketTasks(bucket);
    }
  }, [bucket, loadBucketTasks]);

  async function handleCompleteTask() {
    if (!task) return;

    await showToast({ style: Toast.Style.Animated, title: "Completing task" });

    try {
      await completeTask(task.id);
      await showToast({ style: Toast.Style.Success, title: "Task completed" });
      await loadBucketTasks(bucket!, task.id);
    } catch (err) {
      await showFailureToast(err, { title: "Unable to complete task" });
    }
  }

  async function handleSkipTask() {
    if (!bucket || !task) return;
    await loadBucketTasks(bucket, task.id);
  }

  async function handleTaskUpdated() {
    if (!bucket) return;
    await loadBucketTasks(bucket, task?.id);
  }

  function handlePickBucket(selectedBucket: Bucket) {
    setHasLoadedBucketTasks(false);
    setIsLoadingTasks(true);
    setTasks([]);
    setTask(null);
    setBucket(selectedBucket);
  }

  if (!bucket) {
    return <BucketPicker projects={projects} isLoading={isLoadingProjects} onPick={handlePickBucket} />;
  }

  if (error) {
    return <ErrorView error={error} onRetry={() => loadBucketTasks(bucket, task?.id)} />;
  }

  return (
    <ZenTaskView
      bucket={bucket}
      task={task}
      projects={projects}
      projectsMap={projectsMap}
      remainingTaskCount={getEligibleTasks(tasks).length}
      isLoading={isLoadingTasks || !hasLoadedBucketTasks}
      onComplete={handleCompleteTask}
      onSkip={handleSkipTask}
      onTaskUpdated={handleTaskUpdated}
    />
  );
}
