/**
 * Subtask Detail View Component - Shows detailed information about a specific subtask
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
import { Task, TaskStatus, Subtask, TaskMasterSettings } from "../types/task";
import { updateSubtaskStatus } from "../lib/write-utils";

// Status configuration for display
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

interface SubtaskDetailViewProps {
  parentTask: Task;
  subtask: Subtask;
  allTasks: Task[];
  onBack: () => void;
  onBackToTask: () => void;
  onSubtaskUpdate?: () => void;
}

function generateSubtaskMarkdown(
  parentTask: Task,
  subtask: Subtask,
  allTasks: Task[],
): string {
  const statusConfig = STATUS_CONFIG[subtask.status];

  let markdown = `# ${subtask.title}\n\n`;

  // Parent task context
  markdown += `## Parent Task\n\n`;
  markdown += `**${parentTask.title}** (${parentTask.id})\n\n`;

  // Subtask overview
  markdown += `## Overview\n\n`;
  markdown += `- **Subtask ID**: ${subtask.id}\n`;
  markdown += `- **Status**: ${statusConfig.title}\n`;

  markdown += `\n`;

  // Description
  if (subtask.description) {
    markdown += `## Description\n\n${subtask.description}\n\n`;
  } else {
    markdown += `## Description\n\n*No description provided*\n\n`;
  }

  // Dependencies
  if (subtask.dependencies && subtask.dependencies.length > 0) {
    markdown += `## Dependencies\n\n`;
    subtask.dependencies.forEach((depId) => {
      const depIdStr = String(depId);
      const depIdNum =
        typeof depId === "number" ? depId : parseInt(String(depId), 10);

      // Check if dependency is another subtask in the same parent task
      let depSubtask = null;
      if (parentTask.subtasks) {
        // Try to find by number ID first, then by string comparison
        depSubtask = parentTask.subtasks.find(
          (s) => s.id === depIdNum || s.id.toString() === depIdStr,
        );
      }

      if (depSubtask) {
        const depStatus = STATUS_CONFIG[depSubtask.status];
        markdown += `- **Subtask ${depSubtask.id}**: ${depSubtask.title} (${depStatus.title})\n`;
      } else {
        // Check if it's a dependency on another task
        const depTask = Array.isArray(allTasks)
          ? allTasks.find(
              (t) => t.id === depIdStr || t.id === depIdNum.toString(),
            )
          : null;
        if (depTask) {
          const depStatus = STATUS_CONFIG[depTask.status];
          markdown += `- **Task ${depTask.id}**: ${depTask.title} (${depStatus.title})\n`;
        } else {
          // Also try to find subtasks in other tasks (cross-task subtask dependencies)
          let foundInOtherTask = false;
          if (Array.isArray(allTasks)) {
            for (const task of allTasks) {
              if (task.subtasks) {
                const crossSubtask = task.subtasks.find(
                  (s) => s.id === depIdNum || s.id.toString() === depIdStr,
                );
                if (crossSubtask) {
                  const depStatus = STATUS_CONFIG[crossSubtask.status];
                  markdown += `- **Subtask ${crossSubtask.id}** (from Task ${task.id}): ${crossSubtask.title} (${depStatus.title})\n`;
                  foundInOtherTask = true;
                  break;
                }
              }
            }
          }

          if (!foundInOtherTask) {
            markdown += `- **ID ${depId}** (not found)\n`;
          }
        }
      }
    });
    markdown += `\n`;
  }

  // Context and notes section
  markdown += `## Context\n\n`;
  markdown += `This subtask is part of the larger task "${parentTask.title}" and contributes to its completion.\n\n`;

  if (parentTask.details) {
    markdown += `### Parent Task Details\n\n${parentTask.details}\n\n`;
  }

  return markdown;
}

export function SubtaskDetailView({
  parentTask,
  subtask,
  allTasks,
  onBack,
  onBackToTask,
  onSubtaskUpdate,
}: SubtaskDetailViewProps) {
  const markdown = generateSubtaskMarkdown(parentTask, subtask, allTasks);
  const statusConfig = STATUS_CONFIG[subtask.status];

  // Handle status changes
  const handleStatusChange = async (newStatus: TaskStatus) => {
    try {
      const settings = getPreferenceValues<TaskMasterSettings>();
      await updateSubtaskStatus(
        settings.projectRoot,
        parentTask.id,
        subtask.id,
        newStatus,
      );

      showToast({
        style: Toast.Style.Success,
        title: "Subtask Updated",
        message: `Subtask ${parentTask.id}.${subtask.id} status changed to ${newStatus}`,
      });

      // Trigger refresh if callback provided
      if (onSubtaskUpdate) {
        onSubtaskUpdate();
      }
    } catch (error) {
      showFailureToast(error, { title: "Update Failed" });
    }
  };

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Subtask ID"
            text={subtask.id.toString()}
          />
          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item
              text={statusConfig.title}
              color={statusConfig.color}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label
            title="Parent Task"
            text={`${parentTask.title} (${parentTask.id})`}
          />
          {subtask.dependencies && subtask.dependencies.length > 0 && (
            <Detail.Metadata.Label
              title="Dependencies"
              text={`${subtask.dependencies.length} item(s)`}
            />
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action
            title="Back to Subtasks"
            icon={Icon.ArrowLeft}
            shortcut={{ modifiers: ["cmd"], key: "b" }}
            onAction={onBack}
          />
          <Action
            title="Back to Parent Task"
            icon={Icon.ArrowUp}
            shortcut={{ modifiers: ["cmd"], key: "t" }}
            onAction={onBackToTask}
          />
          <ActionPanel.Submenu
            title="Change Status"
            icon={Icon.Pencil}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
          >
            {Object.entries(STATUS_CONFIG)
              .filter(([status]) => status !== subtask.status)
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
              title="Subtask Name (with Id)"
              content={`${subtask.title} (ID: ${parentTask.id}.${subtask.id})`}
            />
            <Action.CopyToClipboard
              title="Subtask Id"
              content={`${parentTask.id}.${subtask.id}`}
            />
            <Action.CopyToClipboard
              title="Subtask Title"
              content={subtask.title}
            />
            <Action.CopyToClipboard
              title="Subtask Description"
              content={subtask.description || ""}
            />
            <Action.CopyToClipboard
              title="Subtask Summary"
              content={`Subtask ${parentTask.id}.${subtask.id}: ${subtask.title}\nStatus: ${subtask.status}\n${subtask.description ? `Description: ${subtask.description}` : ""}`}
            />
            <Action.CopyToClipboard
              title="Subtask as JSON"
              content={JSON.stringify(subtask, null, 2)}
            />
          </ActionPanel.Submenu>
        </ActionPanel>
      }
    />
  );
}
