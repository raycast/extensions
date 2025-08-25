/**
 * TaskMaster Kanban Board Command - Simplified for view-only operations
 */

import {
  ActionPanel,
  Action,
  List,
  Icon,
  Color,
  launchCommand,
  LaunchType,
  getPreferenceValues,
} from "@raycast/api";
import { useState, useMemo } from "react";
import { useTasks } from "./hooks/useTaskMaster";
import { TaskDetailView } from "./components/TaskDetailView";
import {
  Task,
  TaskStatus,
  TaskPriority,
  TaskMasterSettings,
} from "./types/task";

// Status configuration for Kanban columns
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

function TaskItem({
  task,
  onShowDetail,
}: {
  task: Task;
  onShowDetail: (task: Task) => void;
}) {
  const priorityConfig = PRIORITY_CONFIG[task.priority];

  const subtitle = useMemo(() => {
    const parts = [];
    if (task.priority) parts.push(`Priority: ${task.priority}`);
    if (task.complexityScore)
      parts.push(`Complexity: ${task.complexityScore}/10`);
    if (task.subtasks?.length) parts.push(`${task.subtasks.length} subtasks`);
    if (task.dependencies?.length)
      parts.push(`${task.dependencies.length} deps`);
    return parts.join(" • ");
  }, [task]);

  const accessories = useMemo(() => {
    const accessories = [];

    // Priority indicator
    if (task.priority) {
      accessories.push({
        icon: { source: priorityConfig.icon, tintColor: priorityConfig.color },
        tooltip: `Priority: ${task.priority}`,
      });
    }

    // Complexity score
    if (task.complexityScore) {
      accessories.push({
        text: `${task.complexityScore}/10`,
        tooltip: `Complexity Score: ${task.complexityScore}/10`,
      });
    }

    // Subtask count
    if (task.subtasks?.length) {
      accessories.push({
        icon: Icon.List,
        text: String(task.subtasks.length),
        tooltip: `${task.subtasks.length} subtasks`,
      });
    }

    return accessories;
  }, [task]);

  return (
    <List.Item
      title={task.title}
      subtitle={subtitle}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action
            title="View Details"
            icon={Icon.Eye}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            onAction={() => onShowDetail(task)}
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
        </ActionPanel>
      }
    />
  );
}

// Main Kanban Board Component
export default function KanbanBoardCommand() {
  const [selectedStatus, setSelectedStatus] = useState<TaskStatus | "all">(
    "all",
  );
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const settings = getPreferenceValues<TaskMasterSettings>();

  const {
    data: tasks = [],
    isLoading,
    revalidate,
  } = useTasks({
    projectRoot: settings.projectRoot,
  });

  // Group tasks by status for Kanban view
  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = {
      pending: [],
      "in-progress": [],
      review: [],
      done: [],
      deferred: [],
      cancelled: [],
    };

    // Ensure tasks is always an array to prevent forEach errors
    if (!Array.isArray(tasks)) {
      return grouped;
    }

    tasks.forEach((task) => {
      if (task.status in grouped) {
        grouped[task.status].push(task);
      }
    });

    return grouped;
  }, [tasks]);

  // Error handling is now managed in the hook with Toast notifications
  // We continue with graceful degradation instead of showing error UI

  const filteredTasks =
    selectedStatus === "all"
      ? tasks
      : tasks.filter((task) => task.status === selectedStatus);

  // Show task detail if a task is selected
  if (selectedTask) {
    return (
      <TaskDetailView
        task={selectedTask}
        allTasks={tasks}
        onBack={() => setSelectedTask(null)}
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search tasks..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Status"
          value={selectedStatus}
          onChange={(value) => setSelectedStatus(value as TaskStatus | "all")}
        >
          <List.Dropdown.Item title="All Tasks" value="all" />
          <List.Dropdown.Section title="Status">
            {Object.entries(KANBAN_COLUMNS).map(([status, config]) => (
              <List.Dropdown.Item
                key={status}
                title={config.title}
                value={status}
                icon={{ source: config.icon, tintColor: config.color }}
              />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={revalidate}
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
        </ActionPanel>
      }
    >
      {selectedStatus === "all" ? (
        // Kanban view: Show tasks grouped by status
        Object.entries(tasksByStatus).map(([status, statusTasks]) => {
          const config = KANBAN_COLUMNS[status as TaskStatus];
          if (!settings.showCompletedTasks && status === "done") {
            return null;
          }

          return (
            <List.Section
              key={status}
              title={`${config.title} (${statusTasks.length})`}
              subtitle={
                status === "done" && !settings.showCompletedTasks
                  ? "Hidden - Enable in settings"
                  : undefined
              }
            >
              {statusTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onShowDetail={setSelectedTask}
                />
              ))}
            </List.Section>
          );
        })
      ) : (
        // Single status view
        <List.Section
          title={`${KANBAN_COLUMNS[selectedStatus].title} (${filteredTasks.length})`}
        >
          {filteredTasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onShowDetail={setSelectedTask}
            />
          ))}
        </List.Section>
      )}

      {tasks.length === 0 && !isLoading && (
        <List.Item
          title="No Tasks Found"
          subtitle="No tasks available in this project. Check your project configuration or create tasks using TaskMaster CLI."
          accessories={[{ icon: Icon.Plus }]}
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
                title="Open Settings"
                icon={Icon.Gear}
                onAction={() =>
                  launchCommand({
                    name: "settings",
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
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
