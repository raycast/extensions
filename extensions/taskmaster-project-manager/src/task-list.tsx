/**
 * TaskMaster Task List Command - Simplified for view-only operations
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
  showToast,
  Toast,
} from "@raycast/api";
import { useState, useMemo } from "react";
import { useTasks } from "./hooks/useTaskMaster";
import { deleteTask } from "./lib/write-utils";
import { TaskDetailView } from "./components/TaskDetailView";
import {
  Task,
  TaskStatus,
  TaskPriority,
  TaskMasterSettings,
} from "./types/task";

// Status and priority configurations
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

function TaskListItem({
  task,
  showSubtasks,
  onShowDetail,
  onTaskUpdate,
}: {
  task: Task;
  showSubtasks: boolean;
  onShowDetail: (task: Task) => void;
  onTaskUpdate: () => void;
}) {
  const statusConfig = STATUS_CONFIG[task.status];
  const priorityConfig = PRIORITY_CONFIG[task.priority];

  const subtitle = useMemo(() => {
    const parts = [`ID: ${task.id}`];
    if (task.complexityScore)
      parts.push(`Complexity: ${task.complexityScore}/10`);
    if (task.subtasks?.length) parts.push(`${task.subtasks.length} subtasks`);
    if (task.dependencies?.length)
      parts.push(`${task.dependencies.length} dependencies`);
    return parts.join(" • ");
  }, [task]);

  // Handle task deletion with enhanced error handling
  const handleDeleteTask = async () => {
    try {
      const settings = getPreferenceValues<TaskMasterSettings>();

      // deleteTask now handles its own success/error toasts
      await deleteTask(settings.projectRoot, task.id);

      // Trigger refresh only on success
      onTaskUpdate();
    } catch (error) {
      // Error toast is already shown by deleteTask function
      console.error("Task deletion failed:", error);
    }
  };

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
    <>
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
              title="Open Kanban Board"
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

      {/* Show subtasks if enabled */}
      {showSubtasks &&
        task.subtasks?.map((subtask) => (
          <List.Item
            key={`${task.id}.${subtask.id}`}
            title={`  ↳ ${subtask.title}`}
            subtitle={`Subtask ${task.id}.${subtask.id} • ${subtask.status}`}
            accessories={[
              {
                icon: {
                  source: STATUS_CONFIG[subtask.status]?.icon || Icon.Circle,
                  tintColor:
                    STATUS_CONFIG[subtask.status]?.color || Color.PrimaryText,
                },
                tooltip: `Status: ${subtask.status}`,
              },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="View Subtask"
                  icon={Icon.Eye}
                  onAction={() => {
                    showToast({
                      style: Toast.Style.Success,
                      title: "Subtask Details",
                      message: `${subtask.title}\n${subtask.description || "No description"}`,
                    });
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
    </>
  );
}

export default function TaskListCommand() {
  const [filterStatus, setFilterStatus] = useState<TaskStatus | "all">("all");
  const [showSubtasks, setShowSubtasks] = useState(false);
  const [sortBy, setSortBy] = useState<
    "id" | "priority" | "status" | "complexity"
  >("id");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const settings = getPreferenceValues<TaskMasterSettings>();
  const {
    data: tasks = [],
    isLoading,
    revalidate,
  } = useTasks({ projectRoot: settings.projectRoot });

  // Filter and sort tasks
  const processedTasks = useMemo(() => {
    // Ensure tasks is always an array to prevent sort() errors
    if (!Array.isArray(tasks)) {
      return [];
    }

    let filtered = tasks;

    // Apply status filter
    if (filterStatus !== "all") {
      filtered = filtered.filter((task) => task.status === filterStatus);
    }

    // Hide completed tasks if setting is disabled
    if (!settings.showCompletedTasks && filterStatus === "all") {
      filtered = filtered.filter((task) => task.status !== "done");
    }

    // Sort tasks
    const sortComparators = {
      priority: (a: Task, b: Task) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      },
      status: (a: Task, b: Task) => a.status.localeCompare(b.status),
      complexity: (a: Task, b: Task) =>
        (b.complexityScore || 0) - (a.complexityScore || 0),
      id: (a: Task, b: Task) =>
        a.id.localeCompare(b.id, undefined, { numeric: true }),
    };

    filtered.sort(sortComparators[sortBy]);
    return filtered;
  }, [tasks, filterStatus, sortBy, settings.showCompletedTasks]);

  // Error handling is now managed in the hook with Toast notifications
  // We continue with graceful degradation instead of showing error UI

  const stats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === "done").length;
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, done, completionRate };
  }, [tasks]);

  // Show task detail if a task is selected
  if (selectedTask) {
    return (
      <TaskDetailView
        task={selectedTask}
        allTasks={tasks}
        onBack={() => setSelectedTask(null)}
        onTaskUpdate={() => {
          setSelectedTask(null);
          revalidate();
        }}
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={`Search ${stats.total} tasks...`}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter Options"
          value={`${filterStatus}|${sortBy}|${showSubtasks}`}
          onChange={(value) => {
            const [status, sort, subtasks] = value.split("|");
            setFilterStatus(status as TaskStatus | "all");
            setSortBy(sort as typeof sortBy);
            setShowSubtasks(subtasks === "true");
          }}
        >
          <List.Dropdown.Section title="Status Filter">
            <List.Dropdown.Item
              title="All Tasks"
              value={`all|${sortBy}|${showSubtasks}`}
            />
            {Object.entries(STATUS_CONFIG).map(([status, config]) => (
              <List.Dropdown.Item
                key={status}
                title={config.title}
                value={`${status}|${sortBy}|${showSubtasks}`}
                icon={{ source: config.icon, tintColor: config.color }}
              />
            ))}
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Sort By">
            <List.Dropdown.Item
              title="Task ID"
              value={`${filterStatus}|id|${showSubtasks}|sort`}
            />
            <List.Dropdown.Item
              title="Priority"
              value={`${filterStatus}|priority|${showSubtasks}|sort`}
            />
            <List.Dropdown.Item
              title="Status"
              value={`${filterStatus}|status|${showSubtasks}|sort`}
            />
            <List.Dropdown.Item
              title="Complexity"
              value={`${filterStatus}|complexity|${showSubtasks}|sort`}
            />
          </List.Dropdown.Section>
          <List.Dropdown.Section title="View Options">
            <List.Dropdown.Item
              title="Hide Subtasks"
              value={`${filterStatus}|${sortBy}|false|view`}
            />
            <List.Dropdown.Item
              title="Show Subtasks"
              value={`${filterStatus}|${sortBy}|true|view`}
            />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      <List.Section
        title={`Tasks (${stats.total} total, ${stats.completionRate}% complete)`}
      >
        {processedTasks.length === 0 && !isLoading && (
          <List.Item
            title="No Tasks Found"
            subtitle={
              filterStatus === "all"
                ? "No tasks available in this project. Check your project configuration or create tasks using TaskMaster CLI."
                : `No tasks with status "${filterStatus}". Try adjusting your filter or check project configuration.`
            }
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
                  title="Clear Filters"
                  icon={Icon.Eraser}
                  onAction={() => {
                    setFilterStatus("all");
                    setSortBy("id");
                  }}
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

        {processedTasks.map((task) => (
          <TaskListItem
            key={task.id}
            task={task}
            showSubtasks={showSubtasks}
            onShowDetail={setSelectedTask}
            onTaskUpdate={revalidate}
          />
        ))}
      </List.Section>
    </List>
  );
}
