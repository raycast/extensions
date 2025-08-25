/**
 * TaskMaster Search Tasks Command - Simplified for view-only operations
 * Advanced task search and filtering capabilities
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

// Search configurations
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

const PRIORITY_CONFIG: Record<TaskPriority, { icon: Icon; color: Color }> = {
  high: { icon: Icon.ExclamationMark, color: Color.Red },
  medium: { icon: Icon.Minus, color: Color.Orange },
  low: { icon: Icon.ChevronDown, color: Color.PrimaryText },
};

function TaskSearchItem({
  task,
  onShowDetail,
}: {
  task: Task;
  onShowDetail: (task: Task) => void;
}) {
  const statusConfig = STATUS_CONFIG[task.status];
  const priorityConfig = PRIORITY_CONFIG[task.priority];

  const subtitle = useMemo(() => {
    const parts = [`ID: ${task.id}`];
    if (task.complexityScore)
      parts.push(`Complexity: ${task.complexityScore}/10`);
    if (task.subtasks?.length) parts.push(`${task.subtasks.length} subtasks`);
    return parts.join(" • ");
  }, [task]);

  const accessories = [
    {
      icon: { source: priorityConfig.icon, tintColor: priorityConfig.color },
      tooltip: `Priority: ${task.priority}`,
    },
    {
      icon: { source: statusConfig.icon, tintColor: statusConfig.color },
      tooltip: `Status: ${statusConfig.title}`,
    },
  ];

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

export default function SearchTasksCommand() {
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "all">(
    "all",
  );
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const settings = getPreferenceValues<TaskMasterSettings>();
  const {
    data: tasks = [],
    isLoading,
    revalidate,
  } = useTasks({ projectRoot: settings.projectRoot });

  // Apply filters
  const filteredTasks = useMemo(() => {
    // Ensure tasks is always an array to prevent sort() errors
    if (!Array.isArray(tasks)) {
      return [];
    }

    let filtered = tasks;

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((task) => task.status === statusFilter);
    }

    // Apply priority filter
    if (priorityFilter !== "all") {
      filtered = filtered.filter((task) => task.priority === priorityFilter);
    }

    // Hide completed tasks if setting is disabled
    if (!settings.showCompletedTasks) {
      filtered = filtered.filter((task) => task.status !== "done");
    }

    // Sort by relevance (priority first, then complexity)
    filtered.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff =
        priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return (a.complexityScore || 0) - (b.complexityScore || 0);
    });

    return filtered;
  }, [tasks, statusFilter, priorityFilter, settings.showCompletedTasks]);

  // Error handling is now managed in the hook with Toast notifications
  // We continue with graceful degradation instead of showing error UI

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
      searchBarPlaceholder="Search tasks by title, description, or ID..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter Options"
          value={`${statusFilter}-${priorityFilter}`}
          onChange={(value) => {
            const [status, priority] = value.split("-");
            setStatusFilter(status as TaskStatus | "all");
            setPriorityFilter(priority as TaskPriority | "all");
          }}
        >
          <List.Dropdown.Section title="Status Filter">
            <List.Dropdown.Item
              title="All Status"
              value={`all-${priorityFilter}`}
            />
            {Object.entries(STATUS_CONFIG).map(([status, config]) => (
              <List.Dropdown.Item
                key={status}
                title={config.title}
                value={`${status}-${priorityFilter}`}
                icon={{ source: config.icon, tintColor: config.color }}
              />
            ))}
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Priority Filter">
            <List.Dropdown.Item
              title="All Priorities"
              value={`${statusFilter}-all`}
            />
            {Object.entries(PRIORITY_CONFIG).map(([priority, config]) => (
              <List.Dropdown.Item
                key={priority}
                title={priority.charAt(0).toUpperCase() + priority.slice(1)}
                value={`${statusFilter}-${priority}`}
                icon={{ source: config.icon, tintColor: config.color }}
              />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
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
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={revalidate}
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
        </ActionPanel>
      }
    >
      <List.Section title={`Search Results (${filteredTasks.length} tasks)`}>
        {filteredTasks.length === 0 && !isLoading && (
          <List.Item
            title="No Tasks Found"
            subtitle="Try adjusting your search criteria or filters. Check project configuration if no tasks are available."
            accessories={[{ icon: Icon.MagnifyingGlass }]}
            actions={
              <ActionPanel>
                <Action
                  title="Clear Filters"
                  icon={Icon.Eraser}
                  onAction={() => {
                    setStatusFilter("all");
                    setPriorityFilter("all");
                  }}
                />
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
              </ActionPanel>
            }
          />
        )}

        {filteredTasks.map((task) => (
          <TaskSearchItem
            key={task.id}
            task={task}
            onShowDetail={setSelectedTask}
          />
        ))}
      </List.Section>
    </List>
  );
}
