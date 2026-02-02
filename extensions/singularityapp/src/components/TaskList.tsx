import { ActionPanel, List, Action, Icon, Color, Detail } from "@raycast/api";
import { useState, useEffect } from "react";
import { Task, Project, getProjectIcon, getNote } from "../api";
import TaskActions from "./TaskActions";
import { parseNoteContent } from "../utils/delta-to-markdown";
import { getPriorityConfig } from "../utils/priorities";
import { NO_TOKEN_MESSAGE } from "../utils/constants";

export function formatTime(timestamp: string | undefined): string {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  return date.toLocaleDateString([], { day: "2-digit", month: "2-digit", year: "numeric" });
}

interface TaskListItemProps {
  task: Task;
  project: Project | undefined;
  projects?: Project[];
  onTaskUpdated?: () => void;
}

export function TaskListItem({ task, project, projects, onTaskUpdated }: TaskListItemProps) {
  const accessories: List.Item.Accessory[] = [];
  const taskTitle = task.title || "(Untitled task)";
  const isCompleted = task.checked === 1 || task.complete === 1;

  // Show a note icon when the task has a note
  if (task.note) {
    accessories.push({ icon: Icon.Document, tooltip: "Has note" });
  }

  if (task.deadline) {
    accessories.push({
      text: formatTime(task.deadline),
      icon: { source: Icon.Flag, tintColor: Color.Orange },
    });
  }

  switch (task.priority) {
    case 0:
    case undefined:
    case null:
      accessories.push({ icon: { source: Icon.ExclamationMark, tintColor: Color.Red } });
      break;
    case 2:
      accessories.push({ icon: { source: Icon.ArrowDown, tintColor: Color.Blue } });
      break;
    default:
      break;
  }

  if (project) {
    accessories.push({ text: project.title, icon: getProjectIcon(project) });
  }

  return (
    <List.Item
      icon={isCompleted ? Icon.CheckCircle : Icon.Circle}
      title={taskTitle}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action.Push
            title="View Task Details"
            icon={Icon.Sidebar}
            target={<TaskDetail task={task} project={project} projects={projects} onTaskUpdated={onTaskUpdated} />}
          />
          <TaskActions task={task} projects={projects} onTaskUpdated={onTaskUpdated} />
        </ActionPanel>
      }
    />
  );
}

interface TaskDetailProps {
  task: Task;
  project?: Project;
  projects?: Project[];
  onTaskUpdated?: () => void;
}

export function TaskDetail({ task, project, projects, onTaskUpdated }: TaskDetailProps) {
  const [noteContent, setNoteContent] = useState<string | null>(null);
  const [isLoadingNote, setIsLoadingNote] = useState(false);

  const taskTitle = task.title || "(Untitled task)";
  const isCompleted = task.checked === 1 || task.complete === 1;
  const priority = getPriorityConfig(task.priority);

  // Check if note field looks like an ID (starts with N-T- or similar pattern)
  const isNoteId = task.note && /^N-[A-Z]-[a-f0-9-]+$/i.test(task.note);

  useEffect(() => {
    async function fetchNoteContent() {
      if (isNoteId && task.note) {
        setIsLoadingNote(true);
        const note = await getNote(task.note);
        if (note) {
          // Try different possible content fields
          const content = note.text || note.content || (typeof note.delta === "string" ? note.delta : null);
          setNoteContent(content);
        }
        setIsLoadingNote(false);
      }
    }
    fetchNoteContent();
  }, [task.note, isNoteId]);

  let displayedDate = "Date Not Set";
  let displayedDeadline = "No deadline";

  if (task.start) {
    const startDate = new Date(task.start);
    displayedDate = task.useTime ? startDate.toLocaleString() : startDate.toLocaleDateString();
  }

  if (task.deadline) {
    const deadlineDate = new Date(task.deadline);
    displayedDeadline = deadlineDate.toLocaleDateString();
  }

  // Determine what to display for notes
  let noteDisplay = "";
  if (isLoadingNote) {
    noteDisplay = "*Loading note...*";
  } else if (noteContent) {
    noteDisplay = parseNoteContent(noteContent);
  } else if (task.note && !isNoteId) {
    // Not an ID, display as-is (might be delta format)
    noteDisplay = parseNoteContent(task.note);
  }

  const markdown = `# ${taskTitle}\n\n${noteDisplay}`;

  return (
    <Detail
      navigationTitle={taskTitle}
      isLoading={isLoadingNote}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          {project ? (
            <Detail.Metadata.Label title="Project" text={project.title} icon={getProjectIcon(project)} />
          ) : (
            <Detail.Metadata.Label title="Project" text="Inbox" icon={Icon.Tray} />
          )}

          <Detail.Metadata.Label
            title="Status"
            text={isCompleted ? "Completed" : "Active"}
            icon={isCompleted ? Icon.CheckCircle : Icon.Circle}
          />

          <Detail.Metadata.Label title="Date" text={displayedDate} icon={Icon.Calendar} />
          <Detail.Metadata.Label title="Deadline" text={displayedDeadline} icon={Icon.Flag} />

          <Detail.Metadata.Label
            title="Priority"
            text={priority.name}
            icon={{ source: priority.icon, tintColor: priority.color }}
          />

          {task.tags && task.tags.length > 0 ? (
            <Detail.Metadata.TagList title="Tags">
              {task.tags.map((tag, index) => (
                <Detail.Metadata.TagList.Item key={index} text={tag} />
              ))}
            </Detail.Metadata.TagList>
          ) : null}

          {task.journalDate || task.completeLast ? <Detail.Metadata.Separator /> : null}

          {task.journalDate ? (
            <Detail.Metadata.Label
              title="Journal Date"
              text={new Date(task.journalDate).toLocaleDateString()}
              icon={Icon.Book}
            />
          ) : null}

          {task.completeLast ? (
            <Detail.Metadata.Label
              title="Last Completed"
              text={new Date(task.completeLast).toLocaleString()}
              icon={Icon.CheckCircle}
            />
          ) : null}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <TaskActions task={task} projects={projects} onTaskUpdated={onTaskUpdated} />
        </ActionPanel>
      }
    />
  );
}

export function NoTokenView() {
  return (
    <List>
      <List.EmptyView icon={Icon.Key} title="API Token Not Set" description={NO_TOKEN_MESSAGE} />
    </List>
  );
}

export function ErrorView({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <List>
      <List.EmptyView
        icon={Icon.ExclamationMark}
        title="Error Loading Tasks"
        description={error}
        actions={
          <ActionPanel>
            <Action title="Retry" icon={Icon.RotateClockwise} onAction={onRetry} />
          </ActionPanel>
        }
      />
    </List>
  );
}
