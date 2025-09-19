/**
 * TaskMaster Task Detail View - Shows detailed information about a specific task
 */

import {
  ActionPanel,
  Action,
  Detail,
  Icon,
  Color,
  launchCommand,
  LaunchType,
  getPreferenceValues,
} from "@raycast/api";
import { useTasks } from "./hooks/useTaskMaster";
import { Task, TaskStatus, TaskMasterSettings } from "./types/task";

// Status configuration for display
const KANBAN_COLUMNS: Record<
  TaskStatus,
  { title: string; icon: Icon; color: Color }
> = {
  pending: { title: "Pending", icon: Icon.Circle, color: Color.PrimaryText },
  "in-progress": { title: "In Progress", icon: Icon.Clock, color: Color.Blue },
  review: { title: "Review", icon: Icon.Eye, color: Color.Orange },
  done: { title: "Done", icon: Icon.CheckCircle, color: Color.Green },
  deferred: { title: "Deferred", icon: Icon.Pause, color: Color.Yellow },
  cancelled: { title: "Cancelled", icon: Icon.XMarkCircle, color: Color.Red },
};

function generateTaskMarkdown(task: Task, allTasks: Task[]): string {
  const statusConfig = KANBAN_COLUMNS[task.status];

  let markdown = `# ${task.title}\n\n`;

  // Status and Priority
  markdown += `## Overview\n\n`;
  markdown += `- **Status**: ${statusConfig.title}\n`;
  markdown += `- **Priority**: ${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}\n`;

  if (task.complexityScore) {
    markdown += `- **Complexity**: ${task.complexityScore}/10\n`;
  }

  markdown += `\n`;

  // Description
  if (task.description) {
    markdown += `## Description\n\n${task.description}\n\n`;
  }

  // Details
  if (task.details) {
    markdown += `## Implementation Details\n\n${task.details}\n\n`;
  }

  // Dependencies
  if (task.dependencies && task.dependencies.length > 0) {
    markdown += `## Dependencies\n\n`;
    task.dependencies.forEach((depId) => {
      const depTask = Array.isArray(allTasks)
        ? allTasks.find((t) => t.id === depId)
        : null;
      if (depTask) {
        const depStatus = KANBAN_COLUMNS[depTask.status];
        markdown += `- **${depTask.title}** (${depStatus.title})\n`;
      } else {
        markdown += `- Task ${depId} (not found)\n`;
      }
    });
    markdown += `\n`;
  }

  // Subtasks
  if (task.subtasks && task.subtasks.length > 0) {
    markdown += `## Subtasks (${task.subtasks.length})\n\n`;
    task.subtasks.forEach((subtask) => {
      const subtaskStatus = KANBAN_COLUMNS[subtask.status];
      markdown += `### ${subtask.title}\n`;
      markdown += `- **Status**: ${subtaskStatus.title}\n`;
      if (subtask.description) {
        markdown += `- **Description**: ${subtask.description}\n`;
      }
      if (subtask.dependencies && subtask.dependencies.length > 0) {
        markdown += `- **Dependencies**: ${subtask.dependencies.join(", ")}\n`;
      }
      markdown += `\n`;
    });
  }

  return markdown;
}

export default function TaskDetailCommand({
  arguments: args,
}: {
  arguments: { taskId?: string };
}) {
  const taskId = args?.taskId || "";
  const settings = getPreferenceValues<TaskMasterSettings>();

  const {
    data: tasks = [],
    isLoading,
    revalidate,
  } = useTasks({
    projectRoot: settings.projectRoot,
  });

  // Find the specific task
  const task = tasks.find((t) => t.id === taskId);

  // Error handling is now managed in the hook with Toast notifications
  // We continue with graceful degradation - show task not found state

  if (!task && !isLoading) {
    return (
      <Detail
        markdown={`# Task Not Found\n\nTask with ID "${taskId}" could not be found in the current project.`}
        actions={
          <ActionPanel>
            <Action
              title="Back to Kanban Board"
              icon={Icon.ArrowLeft}
              onAction={() =>
                launchCommand({
                  name: "kanban-board",
                  type: LaunchType.UserInitiated,
                })
              }
            />
            <Action
              title="Task List"
              icon={Icon.List}
              onAction={() =>
                launchCommand({
                  name: "task-list",
                  type: LaunchType.UserInitiated,
                })
              }
            />
          </ActionPanel>
        }
      />
    );
  }

  const markdown = task
    ? generateTaskMarkdown(task, tasks)
    : "Loading task details...";

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Back to Kanban Board"
            icon={Icon.ArrowLeft}
            shortcut={{ modifiers: ["cmd"], key: "b" }}
            onAction={() =>
              launchCommand({
                name: "kanban-board",
                type: LaunchType.UserInitiated,
              })
            }
          />
          <Action
            title="Task List"
            icon={Icon.List}
            shortcut={{ modifiers: ["cmd"], key: "l" }}
            onAction={() =>
              launchCommand({
                name: "task-list",
                type: LaunchType.UserInitiated,
              })
            }
          />
          <Action
            title="Search Tasks"
            icon={Icon.MagnifyingGlass}
            shortcut={{ modifiers: ["cmd"], key: "f" }}
            onAction={() =>
              launchCommand({
                name: "search-tasks",
                type: LaunchType.UserInitiated,
              })
            }
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={revalidate}
          />
        </ActionPanel>
      }
    />
  );
}
