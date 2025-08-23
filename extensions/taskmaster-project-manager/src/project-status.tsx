/**
 * TaskMaster Project Status Dashboard - Comprehensive project overview
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
import { TaskMasterSettings } from "./types/task";

export default function ProjectStatusCommand() {
  const settings = getPreferenceValues<TaskMasterSettings>();
  const {
    data: tasks = [],
    isLoading,
    revalidate,
  } = useTasks({ projectRoot: settings.projectRoot });

  // Error handling is now managed in the hook with Toast notifications
  // We continue with graceful degradation - show empty project state

  // Calculate project statistics
  const stats = {
    total: tasks.length,
    pending: tasks.filter((t) => t.status === "pending").length,
    inProgress: tasks.filter((t) => t.status === "in-progress").length,
    review: tasks.filter((t) => t.status === "review").length,
    done: tasks.filter((t) => t.status === "done").length,
    deferred: tasks.filter((t) => t.status === "deferred").length,
    cancelled: tasks.filter((t) => t.status === "cancelled").length,
  };

  const completionRate =
    stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
  const activeRate =
    stats.total > 0
      ? Math.round(((stats.inProgress + stats.review) / stats.total) * 100)
      : 0;

  // Priority breakdown
  const priorities = {
    high: tasks.filter((t) => t.priority === "high" && t.status !== "done")
      .length,
    medium: tasks.filter((t) => t.priority === "medium" && t.status !== "done")
      .length,
    low: tasks.filter((t) => t.priority === "low" && t.status !== "done")
      .length,
  };

  // Blocked tasks (tasks with pending dependencies)
  const blockedTasks = tasks.filter((task) => {
    if (task.status !== "pending" || !task.dependencies?.length) return false;
    return task.dependencies.some((depId) => {
      const depTask = tasks.find((t) => t.id === depId);
      return depTask?.status !== "done";
    });
  });

  // Recent activity (tasks in review or recently completed)
  const recentActivity = tasks
    .filter((t) => t.status === "review" || t.status === "done")
    .slice(0, 5);

  const markdown = `# 📊 Project Status Dashboard

${stats.total === 0 ? "⚠️ **No tasks found.** Check your project configuration or create tasks using TaskMaster CLI." : ""}

## 🎯 Overview
- **Total Tasks:** ${stats.total}
- **Completion Rate:** ${completionRate}% (${stats.done}/${stats.total})
- **Active Work:** ${activeRate}% (${stats.inProgress + stats.review} tasks)
- **Blocked Tasks:** ${blockedTasks.length}

## 📈 Progress Distribution
| Status | Count | Percentage |
|--------|-------|------------|
| ✅ Done | ${stats.done} | ${stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0}% |
| 🔄 In Progress | ${stats.inProgress} | ${stats.total > 0 ? Math.round((stats.inProgress / stats.total) * 100) : 0}% |
| 👀 Review | ${stats.review} | ${stats.total > 0 ? Math.round((stats.review / stats.total) * 100) : 0}% |
| ⏳ Pending | ${stats.pending} | ${stats.total > 0 ? Math.round((stats.pending / stats.total) * 100) : 0}% |
| ⏸️ Deferred | ${stats.deferred} | ${stats.total > 0 ? Math.round((stats.deferred / stats.total) * 100) : 0}% |
| ❌ Cancelled | ${stats.cancelled} | ${stats.total > 0 ? Math.round((stats.cancelled / stats.total) * 100) : 0}% |

## 🚨 Priority Breakdown (Active Tasks)
- **High Priority:** ${priorities.high} tasks
- **Medium Priority:** ${priorities.medium} tasks  
- **Low Priority:** ${priorities.low} tasks

${
  blockedTasks.length > 0
    ? `## 🚧 Blocked Tasks (${blockedTasks.length})
${blockedTasks.map((task) => `- **${task.title}** (${task.id}) - blocked by ${task.dependencies?.length} dependencies`).join("\n")}`
    : ""
}

${
  recentActivity.length > 0
    ? `## 🔄 Recent Activity
${recentActivity.map((task) => `- **${task.title}** (${task.id}) - ${task.status === "review" ? "Ready for review" : "Completed"}`).join("\n")}`
    : ""
}`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Total Tasks"
            text={stats.total.toString()}
          />
          <Detail.Metadata.Separator />

          <Detail.Metadata.TagList title="Completion">
            <Detail.Metadata.TagList.Item
              text={`${completionRate}%`}
              color={Color.Green}
            />
          </Detail.Metadata.TagList>

          <Detail.Metadata.TagList title="Active Work">
            <Detail.Metadata.TagList.Item
              text={`${stats.inProgress + stats.review} tasks`}
              color={Color.Blue}
            />
          </Detail.Metadata.TagList>

          {blockedTasks.length > 0 && (
            <Detail.Metadata.TagList title="Blocked">
              <Detail.Metadata.TagList.Item
                text={`${blockedTasks.length} tasks`}
                color={Color.Red}
              />
            </Detail.Metadata.TagList>
          )}

          <Detail.Metadata.Separator />

          <Detail.Metadata.TagList title="High Priority">
            <Detail.Metadata.TagList.Item
              text={`${priorities.high} tasks`}
              color={priorities.high > 0 ? Color.Red : Color.SecondaryText}
            />
          </Detail.Metadata.TagList>

          <Detail.Metadata.TagList title="Medium Priority">
            <Detail.Metadata.TagList.Item
              text={`${priorities.medium} tasks`}
              color={priorities.medium > 0 ? Color.Orange : Color.SecondaryText}
            />
          </Detail.Metadata.TagList>

          <Detail.Metadata.TagList title="Low Priority">
            <Detail.Metadata.TagList.Item
              text={`${priorities.low} tasks`}
              color={
                priorities.low > 0 ? Color.PrimaryText : Color.SecondaryText
              }
            />
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
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
            title="Next Task"
            icon={Icon.ArrowRight}
            shortcut={{ modifiers: ["cmd"], key: "j" }}
            onAction={() =>
              launchCommand({
                name: "next-task",
                type: LaunchType.UserInitiated,
              })
            }
          />
          <Action
            title="Kanban Board"
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
