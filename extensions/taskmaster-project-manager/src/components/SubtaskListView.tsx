/**
 * Subtask List View Component - Shows all subtasks for a parent task
 */

import { ActionPanel, Action, List, Icon, Color } from "@raycast/api";
import { Task, TaskStatus, Subtask } from "../types/task";

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

interface SubtaskListViewProps {
  parentTask: Task;
  onBack: () => void;
  onShowSubtaskDetail: (subtask: Subtask) => void;
}

interface SubtaskItemProps {
  subtask: Subtask;
  onShowDetail: (subtask: Subtask) => void;
  onBack: () => void;
}

function SubtaskItem({ subtask, onShowDetail, onBack }: SubtaskItemProps) {
  const statusConfig = STATUS_CONFIG[subtask.status];

  const subtitle = subtask.description
    ? `${subtask.description.substring(0, 80)}${subtask.description.length > 80 ? "..." : ""}`
    : "No description";

  // Build accessories array immutably
  const accessories = [
    {
      icon: { source: statusConfig.icon, tintColor: statusConfig.color },
      tooltip: `Status: ${statusConfig.title}`,
    },
    ...(subtask.dependencies && subtask.dependencies.length > 0
      ? [
          {
            icon: Icon.Link,
            text: subtask.dependencies.length.toString(),
            tooltip: `${subtask.dependencies.length} dependencies`,
          },
        ]
      : []),
  ];

  return (
    <List.Item
      title={subtask.title}
      subtitle={subtitle}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action
            title="View Subtask Details"
            icon={Icon.Eye}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            onAction={() => onShowDetail(subtask)}
          />
          <Action
            title="Back to Task"
            icon={Icon.ArrowLeft}
            shortcut={{ modifiers: ["cmd"], key: "b" }}
            onAction={onBack}
          />
        </ActionPanel>
      }
    />
  );
}

export function SubtaskListView({
  parentTask,
  onBack,
  onShowSubtaskDetail,
}: SubtaskListViewProps) {
  const subtasks = parentTask.subtasks || [];

  // Group subtasks by status
  const subtasksByStatus = subtasks.reduce(
    (acc, subtask) => {
      const status = subtask.status;
      if (!acc[status]) {
        acc[status] = [];
      }
      acc[status].push(subtask);
      return acc;
    },
    {} as Record<TaskStatus, Subtask[]>,
  );

  const completedCount = subtasks.filter((s) => s.status === "done").length;
  const progressPercentage =
    subtasks.length > 0
      ? Math.round((completedCount / subtasks.length) * 100)
      : 0;

  return (
    <List
      navigationTitle={`Subtasks: ${parentTask.title}`}
      searchBarPlaceholder={`Search ${subtasks.length} subtasks...`}
      actions={
        <ActionPanel>
          <Action
            title="Back to Task"
            icon={Icon.ArrowLeft}
            shortcut={{ modifiers: ["cmd"], key: "b" }}
            onAction={onBack}
          />
        </ActionPanel>
      }
    >
      {subtasks.length === 0 ? (
        <List.Item
          title="No Subtasks"
          subtitle="This task doesn't have any subtasks defined"
          accessories={[{ icon: Icon.Minus }]}
          actions={
            <ActionPanel>
              <Action
                title="Back to Task"
                icon={Icon.ArrowLeft}
                shortcut={{ modifiers: ["cmd"], key: "b" }}
                onAction={onBack}
              />
            </ActionPanel>
          }
        />
      ) : (
        <>
          {/* Progress overview */}
          <List.Item
            title={`Progress Overview`}
            subtitle={`${completedCount}/${subtasks.length} completed (${progressPercentage}%)`}
            accessories={[
              { icon: Icon.BarChart },
              { text: `${progressPercentage}%` },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Back to Task"
                  icon={Icon.ArrowLeft}
                  shortcut={{ modifiers: ["cmd"], key: "b" }}
                  onAction={onBack}
                />
              </ActionPanel>
            }
          />

          {/* Group subtasks by status */}
          {Object.entries(STATUS_CONFIG).map(([status, config]) => {
            const statusSubtasks = subtasksByStatus[status as TaskStatus] || [];
            if (statusSubtasks.length === 0) return null;

            return (
              <List.Section
                key={status}
                title={`${config.title} (${statusSubtasks.length})`}
              >
                {statusSubtasks.map((subtask) => (
                  <SubtaskItem
                    key={subtask.id}
                    subtask={subtask}
                    onShowDetail={onShowSubtaskDetail}
                    onBack={onBack}
                  />
                ))}
              </List.Section>
            );
          })}
        </>
      )}
    </List>
  );
}
