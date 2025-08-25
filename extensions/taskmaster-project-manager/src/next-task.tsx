/**
 * TaskMaster Next Task Command - Simplified for view-only operations
 * Get the next available task to work on based on dependencies and priority
 */

import {
  ActionPanel,
  Action,
  List,
  Icon,
  Color,
  launchCommand,
  LaunchType,
  Detail,
  getPreferenceValues,
} from "@raycast/api";
import { useNextTask } from "./hooks/useTaskMaster";
import { TaskStatus, TaskPriority, TaskMasterSettings } from "./types/task";

// Configuration for status and priority display
const STATUS_CONFIG: Record<
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

const PRIORITY_CONFIG: Record<
  TaskPriority,
  { icon: Icon; color: Color; description: string }
> = {
  high: {
    icon: Icon.ExclamationMark,
    color: Color.Red,
    description: "High Priority",
  },
  medium: {
    icon: Icon.Minus,
    color: Color.Orange,
    description: "Medium Priority",
  },
  low: {
    icon: Icon.ChevronDown,
    color: Color.PrimaryText,
    description: "Low Priority",
  },
};

export default function NextTaskCommand() {
  const settings = getPreferenceValues<TaskMasterSettings>();
  const {
    data: nextTask,
    isLoading,
    revalidate,
  } = useNextTask(settings.projectRoot);

  // Error handling is now managed in the hook with Toast notifications
  // We continue with graceful degradation - show no task available state

  // Handle no next task available
  if (!isLoading && !nextTask) {
    return (
      <Detail
        markdown={`# No Next Task Available

Great work! There are currently no tasks available to work on.

This could mean:
- **All tasks are complete** 🎉
- **Remaining tasks are blocked** by dependencies
- **All tasks are already in progress** 
- **No tasks exist yet** in the project

## What to do next:

### Check Task Status
Review your task list to see if there are tasks that need attention:
- Tasks marked as "Review" that can be completed
- Tasks marked as "In Progress" that can be finished
- Blocked tasks where dependencies can be resolved

### Review Dependencies
Check if any tasks are blocked by dependencies that can be resolved.

### Create New Tasks
If all existing work is complete, consider creating new tasks to continue project progress.

## Quick Actions

Use the actions below to explore your tasks or create new ones.`}
        actions={
          <ActionPanel>
            <Action
              title="Add New Task"
              icon={Icon.Plus}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
              onAction={() =>
                launchCommand({
                  name: "add-task",
                  type: LaunchType.UserInitiated,
                })
              }
            />
            <Action
              title="View All Tasks"
              icon={Icon.List}
              onAction={() =>
                launchCommand({
                  name: "task-list",
                  type: LaunchType.UserInitiated,
                })
              }
            />
            <Action
              title="Open Kanban Board"
              icon={Icon.AppWindowGrid3x3}
              onAction={() =>
                launchCommand({
                  name: "kanban-board",
                  type: LaunchType.UserInitiated,
                })
              }
            />
            <Action
              title="Project Status"
              icon={Icon.BarChart}
              onAction={() =>
                launchCommand({
                  name: "project-status",
                  type: LaunchType.UserInitiated,
                })
              }
            />
            <Action
              title="Search Tasks"
              icon={Icon.MagnifyingGlass}
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

  // Handle loading state
  if (isLoading) {
    return (
      <List isLoading={true}>
        <List.Item
          title="Finding Next Task..."
          subtitle="Analyzing task dependencies and priorities"
          accessories={[{ icon: Icon.MagnifyingGlass }]}
        />
      </List>
    );
  }

  // Display the next task
  const statusConfig = STATUS_CONFIG[nextTask!.status];
  const priorityConfig = PRIORITY_CONFIG[nextTask!.priority];

  const taskMarkdown = `# Next Task: ${nextTask!.title}

**Task ID:** ${nextTask!.id}  
**Status:** ${statusConfig.title}  
**Priority:** ${priorityConfig.description}  
${nextTask!.complexityScore ? `**Complexity:** ${nextTask!.complexityScore}/10  ` : ""}

## Description

${nextTask!.description}

${
  nextTask!.details
    ? `## Details

${nextTask!.details}`
    : ""
}

${
  nextTask!.dependencies?.length
    ? `## Dependencies

This task depends on:
${nextTask!.dependencies.map((dep) => `- Task ${dep}`).join("\n")}`
    : ""
}

${
  nextTask!.subtasks?.length
    ? `## Subtasks (${nextTask!.subtasks.length})

${nextTask!.subtasks
  .map(
    (subtask) =>
      `- **${subtask.title}** (${subtask.status})${subtask.description ? `: ${subtask.description}` : ""}`,
  )
  .join("\n")}`
    : ""
}

---

This task has been identified as the next priority item based on task dependencies, priority level, and complexity.

**Note:** This is a view-only interface. Use TaskMaster CLI to update task status and make changes.`;

  return (
    <Detail
      markdown={taskMarkdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Task ID" text={nextTask!.id} />
          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item
              text={statusConfig.title}
              color={statusConfig.color}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.TagList title="Priority">
            <Detail.Metadata.TagList.Item
              text={nextTask!.priority}
              color={priorityConfig.color}
            />
          </Detail.Metadata.TagList>

          {nextTask!.complexityScore ? (
            <Detail.Metadata.Label
              title="Complexity Score"
              text={`${nextTask!.complexityScore}/10`}
            />
          ) : null}

          {nextTask!.subtasks?.length ? (
            <Detail.Metadata.Label
              title="Subtasks"
              text={`${nextTask!.subtasks.length} items`}
            />
          ) : null}

          {nextTask!.dependencies?.length ? (
            <Detail.Metadata.Label
              title="Dependencies"
              text={`${nextTask!.dependencies.length} tasks`}
            />
          ) : null}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action
            title="View Details"
            icon={Icon.Eye}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            onAction={() =>
              launchCommand({
                name: "task-detail",
                type: LaunchType.UserInitiated,
                arguments: { taskId: nextTask!.id },
              })
            }
          />
          <Action
            title="View in Kanban Board"
            icon={Icon.AppWindowGrid3x3}
            shortcut={{ modifiers: ["cmd"], key: "b" }}
            onAction={() =>
              launchCommand({
                name: "kanban-board",
                type: LaunchType.UserInitiated,
              })
            }
          />
          <Action
            title="View All Tasks"
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
            title="Find Next Task"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={revalidate}
          />
          <ActionPanel.Submenu
            title="Copy"
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          >
            <Action.CopyToClipboard
              title="Task Name (with Id)"
              content={`${nextTask!.title} (ID: ${nextTask!.id})`}
            />
            <Action.CopyToClipboard title="Task Id" content={nextTask!.id} />
            <Action.CopyToClipboard
              title="Task Title"
              content={nextTask!.title}
            />
            <Action.CopyToClipboard
              title="Task Description"
              content={nextTask!.description || ""}
            />
            <Action.CopyToClipboard
              title="Task Summary"
              content={`Next Task ${nextTask!.id}: ${nextTask!.title}
Status: ${nextTask!.status}
Priority: ${nextTask!.priority}
${nextTask!.description ? `Description: ${nextTask!.description}` : ""}`}
            />
            <Action.CopyToClipboard
              title="Task as JSON"
              content={JSON.stringify(nextTask!, null, 2)}
            />
          </ActionPanel.Submenu>
        </ActionPanel>
      }
    />
  );
}
