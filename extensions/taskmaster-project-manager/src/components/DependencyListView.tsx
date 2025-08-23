/**
 * Dependency List View Component - Shows all dependencies for a task
 */

import { ActionPanel, Action, List, Icon, Color } from "@raycast/api";
import { Task, TaskStatus } from "../types/task";

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

interface DependencyListViewProps {
  task: Task;
  allTasks: Task[];
  onBack: () => void;
  onShowTaskDetail: (task: Task) => void;
}

interface DependencyItemProps {
  dependencyTask: Task;
  onShowDetail: (task: Task) => void;
  onBack: () => void;
}

function DependencyItem({
  dependencyTask,
  onShowDetail,
  onBack,
}: DependencyItemProps) {
  const statusConfig = STATUS_CONFIG[dependencyTask.status];

  const subtitle = dependencyTask.description
    ? `${dependencyTask.description.substring(0, 80)}${dependencyTask.description.length > 80 ? "..." : ""}`
    : "No description";

  const accessories: Array<{
    icon?: { source: Icon; tintColor: Color } | Icon;
    tooltip?: string;
    text?: string;
  }> = [
    {
      icon: { source: statusConfig.icon, tintColor: statusConfig.color },
      tooltip: `Status: ${statusConfig.title}`,
    },
  ];

  if (dependencyTask.priority) {
    accessories.push({
      text: `${dependencyTask.priority} priority`,
    });
  }

  return (
    <List.Item
      title={`Task ${dependencyTask.id}: ${dependencyTask.title}`}
      subtitle={subtitle}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action
            title="View Task Details"
            icon={Icon.Eye}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            onAction={() => onShowDetail(dependencyTask)}
          />
          <Action
            title="Back"
            icon={Icon.ArrowLeft}
            shortcut={{ modifiers: ["cmd"], key: "b" }}
            onAction={onBack}
          />
        </ActionPanel>
      }
    />
  );
}

export function DependencyListView({
  task,
  allTasks,
  onBack,
  onShowTaskDetail,
}: DependencyListViewProps) {
  const dependencies = task.dependencies || [];

  // Get actual dependency tasks
  const dependencyTasks = dependencies
    .map((depId) =>
      Array.isArray(allTasks) ? allTasks.find((t) => t.id === depId) : null,
    )
    .filter(
      (depTask): depTask is Task => depTask !== undefined && depTask !== null,
    );

  const missingDependencies = dependencies.filter(
    (depId) =>
      !Array.isArray(allTasks) || !allTasks.find((t) => t.id === depId),
  );

  // Group dependencies by status
  const dependenciesByStatus = dependencyTasks.reduce(
    (acc, depTask) => {
      const status = depTask.status;
      if (!acc[status]) {
        acc[status] = [];
      }
      acc[status].push(depTask);
      return acc;
    },
    {} as Record<TaskStatus, Task[]>,
  );

  const completedCount = dependencyTasks.filter(
    (t) => t.status === "done",
  ).length;
  const progressPercentage =
    dependencies.length > 0
      ? Math.round((completedCount / dependencies.length) * 100)
      : 0;

  return (
    <List
      navigationTitle={`Dependencies: ${task.title}`}
      searchBarPlaceholder={`Search ${dependencies.length} dependencies...`}
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
      {dependencies.length === 0 ? (
        <List.Item
          title="No Dependencies"
          subtitle="This task doesn't have any dependencies"
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
            title={`Dependency Progress`}
            subtitle={`${completedCount}/${dependencies.length} completed (${progressPercentage}%)`}
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

          {/* Show missing dependencies first */}
          {missingDependencies.length > 0 && (
            <List.Section
              title={`Missing Dependencies (${missingDependencies.length})`}
            >
              {missingDependencies.map((depId) => (
                <List.Item
                  key={depId}
                  title={`Task ${depId}`}
                  subtitle="Dependency not found in current task list"
                  accessories={[
                    { icon: Icon.QuestionMark, tooltip: "Task not found" },
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
              ))}
            </List.Section>
          )}

          {/* Group dependencies by status */}
          {Object.entries(STATUS_CONFIG).map(([status, config]) => {
            const statusDependencies =
              dependenciesByStatus[status as TaskStatus] || [];
            if (statusDependencies.length === 0) return null;

            return (
              <List.Section
                key={status}
                title={`${config.title} (${statusDependencies.length})`}
              >
                {statusDependencies.map((depTask) => (
                  <DependencyItem
                    key={depTask.id}
                    dependencyTask={depTask}
                    onShowDetail={onShowTaskDetail}
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
