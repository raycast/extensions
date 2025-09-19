/**
 * Shared TaskDetail View Component
 */

import React from "react";
import {
  ActionPanel,
  Action,
  Detail,
  Icon,
  Color,
  showToast,
  Toast,
  getPreferenceValues,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import {
  Task,
  TaskStatus,
  TaskPriority,
  Subtask,
  TaskMasterSettings,
} from "../types/task";
import { SubtaskListView } from "./SubtaskListView";
import { SubtaskDetailView } from "./SubtaskDetailView";
import { DependencyListView } from "./DependencyListView";
import { updateTaskStatus, deleteTask } from "../lib/write-utils";

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

// Priority configuration
const PRIORITY_CONFIG: Record<TaskPriority, { icon: Icon; color: Color }> = {
  high: { icon: Icon.ExclamationMark, color: Color.Red },
  medium: { icon: Icon.Minus, color: Color.Orange },
  low: { icon: Icon.ChevronDown, color: Color.PrimaryText },
};

interface TaskDetailViewProps {
  task: Task;
  allTasks: Task[];
  onBack: () => void;
  onTaskUpdate?: () => void;
}

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
        markdown += `- **Task ${depTask.id}**: ${depTask.title} (${depStatus.title})\n`;
      } else {
        markdown += `- **Task ${depId}** (not found)\n`;
      }
    });
    markdown += `\n*Use "Show Dependencies" action to see detailed dependency information.*\n\n`;
  }

  // Note about subtasks if they exist
  if (task.subtasks && task.subtasks.length > 0) {
    markdown += `## Subtasks\n\n`;
    markdown += `*This task has ${task.subtasks.length} subtask(s). Use "View All Subtasks" action to see detailed subtask information.*\n\n`;
  }

  return markdown;
}

export function TaskDetailView({
  task,
  allTasks,
  onBack,
  onTaskUpdate,
}: TaskDetailViewProps) {
  const [view, setView] = React.useState<
    "task" | "subtasks" | "subtask-detail" | "dependencies"
  >("task");
  const [selectedSubtask, setSelectedSubtask] = React.useState<Subtask | null>(
    null,
  );

  // Pre-calculate all values that depend on hooks with memoization
  const markdown = React.useMemo(() => {
    return generateTaskMarkdown(task, allTasks);
  }, [task, allTasks]);

  const statusConfig = KANBAN_COLUMNS[task.status];
  const priorityConfig = PRIORITY_CONFIG[task.priority];

  // Handle status changes
  const handleStatusChange = async (newStatus: TaskStatus) => {
    try {
      const settings = getPreferenceValues<TaskMasterSettings>();
      await updateTaskStatus(settings.projectRoot, task.id, newStatus);

      showToast({
        style: Toast.Style.Success,
        title: "Task Updated",
        message: `Task ${task.id} status changed to ${newStatus}`,
      });

      // Trigger refresh if callback provided
      if (onTaskUpdate) {
        onTaskUpdate();
      }
    } catch (error) {
      showFailureToast(error, { title: "Update Failed" });
    }
  };

  // Handle task deletion
  const handleDeleteTask = async () => {
    try {
      const settings = getPreferenceValues<TaskMasterSettings>();
      await deleteTask(settings.projectRoot, task.id);

      showToast({
        style: Toast.Style.Success,
        title: "Task Deleted",
        message: `Task ${task.id} "${task.title}" has been deleted`,
      });

      // Go back to the previous view
      onBack();

      // Trigger refresh if callback provided
      if (onTaskUpdate) {
        onTaskUpdate();
      }
    } catch (error) {
      showFailureToast(error, { title: "Delete Failed" });
    }
  };

  // Calculate subtask statistics
  const subtaskStats = React.useMemo(() => {
    if (!task.subtasks || task.subtasks.length === 0) return null;

    const completed = task.subtasks.filter((s) => s.status === "done").length;
    const inProgress = task.subtasks.filter(
      (s) => s.status === "in-progress",
    ).length;
    const pending = task.subtasks.filter((s) => s.status === "pending").length;
    const review = task.subtasks.filter((s) => s.status === "review").length;
    const deferred = task.subtasks.filter(
      (s) => s.status === "deferred",
    ).length;
    const cancelled = task.subtasks.filter(
      (s) => s.status === "cancelled",
    ).length;
    const total = task.subtasks.length;
    const progressPercentage = Math.round((completed / total) * 100);

    return {
      total,
      completed,
      inProgress,
      pending,
      review,
      deferred,
      cancelled,
      progressPercentage,
    };
  }, [task.subtasks]);

  // Render different views based on current view state
  if (view === "subtask-detail" && selectedSubtask) {
    return (
      <SubtaskDetailView
        parentTask={task}
        subtask={selectedSubtask}
        allTasks={allTasks}
        onBack={() => setView("subtasks")}
        onBackToTask={() => setView("task")}
      />
    );
  }

  if (view === "subtasks") {
    return (
      <SubtaskListView
        parentTask={task}
        onBack={() => setView("task")}
        onShowSubtaskDetail={(subtask) => {
          setSelectedSubtask(subtask);
          setView("subtask-detail");
        }}
      />
    );
  }

  if (view === "dependencies") {
    return (
      <DependencyListView
        task={task}
        allTasks={allTasks}
        onBack={() => setView("task")}
        onShowTaskDetail={() => {
          // For now, just go back to the main task view
          // In the future, we could implement task navigation
          setView("task");
        }}
      />
    );
  }

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Task ID" text={task.id} />
          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item
              text={statusConfig.title}
              color={statusConfig.color}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.TagList title="Priority">
            <Detail.Metadata.TagList.Item
              text={
                task.priority.charAt(0).toUpperCase() + task.priority.slice(1)
              }
              color={priorityConfig.color}
            />
          </Detail.Metadata.TagList>

          {task.complexityScore && (
            <Detail.Metadata.Label
              title="Complexity"
              text={`${task.complexityScore}/10`}
            />
          )}

          {task.dependencies && task.dependencies.length > 0 && (
            <Detail.Metadata.Label
              title="Dependencies"
              text={`${task.dependencies.length} task(s)`}
            />
          )}

          {subtaskStats && (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.Label
                title="Subtasks Progress"
                text={`${subtaskStats.completed}/${subtaskStats.total} (${subtaskStats.progressPercentage}%)`}
              />

              {subtaskStats.completed > 0 && (
                <Detail.Metadata.Label
                  title="✅ Completed"
                  text={subtaskStats.completed.toString()}
                />
              )}
              {subtaskStats.inProgress > 0 && (
                <Detail.Metadata.Label
                  title="🔄 In Progress"
                  text={subtaskStats.inProgress.toString()}
                />
              )}
              {subtaskStats.pending > 0 && (
                <Detail.Metadata.Label
                  title="⏳ Pending"
                  text={subtaskStats.pending.toString()}
                />
              )}
              {subtaskStats.review > 0 && (
                <Detail.Metadata.Label
                  title="👀 Review"
                  text={subtaskStats.review.toString()}
                />
              )}
              {subtaskStats.deferred > 0 && (
                <Detail.Metadata.Label
                  title="⏸️ Deferred"
                  text={subtaskStats.deferred.toString()}
                />
              )}
              {subtaskStats.cancelled > 0 && (
                <Detail.Metadata.Label
                  title="❌ Cancelled"
                  text={subtaskStats.cancelled.toString()}
                />
              )}
            </>
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action
            title="Back"
            icon={Icon.ArrowLeft}
            shortcut={{ modifiers: ["cmd"], key: "b" }}
            onAction={onBack}
          />
          <Action
            title="View All Subtasks"
            icon={Icon.List}
            shortcut={{ modifiers: ["cmd"], key: "t" }}
            onAction={() => setView("subtasks")}
          />
          <Action
            title="Show Dependencies"
            icon={Icon.Link}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            onAction={() => setView("dependencies")}
          />
          <ActionPanel.Submenu
            title="Change Status"
            icon={Icon.Pencil}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
          >
            {Object.entries(KANBAN_COLUMNS)
              .filter(([status]) => status !== task.status)
              .map(([status, config]) => (
                <Action
                  key={status}
                  title={config.title}
                  icon={config.icon}
                  onAction={() => handleStatusChange(status as TaskStatus)}
                />
              ))}
          </ActionPanel.Submenu>
          <ActionPanel.Submenu
            title="Copy"
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          >
            <Action.CopyToClipboard
              title="Task Name (with Id)"
              content={`${task.title} (ID: ${task.id})`}
            />
            <Action.CopyToClipboard title="Task Id" content={task.id} />
            <Action.CopyToClipboard title="Task Title" content={task.title} />
            <Action.CopyToClipboard
              title="Task Description"
              content={task.description || ""}
            />
            <Action.CopyToClipboard
              title="Task Summary"
              content={`Task ${task.id}: ${task.title}\nStatus: ${task.status}\nPriority: ${task.priority}\n${task.description ? `Description: ${task.description}` : ""}`}
            />
            <Action.CopyToClipboard
              title="Task as JSON"
              content={JSON.stringify(task, null, 2)}
            />
          </ActionPanel.Submenu>
          <Action
            title="Delete Task"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
            onAction={handleDeleteTask}
          />
        </ActionPanel>
      }
    />
  );
}
