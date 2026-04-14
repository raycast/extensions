/**
 * Search Tasks command
 */

import { useState, useEffect, useMemo } from "react";
import {
  List,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  Color,
  Image,
  Form,
  useNavigation,
} from "@raycast/api";
import {
  searchTasks,
  completeTask,
  snoozeTask,
  deleteTask,
  updateTask,
} from "./lib/api";
import { Task, TaskStatus, TaskCategory } from "./lib/types";
import { useAuth } from "./hooks/useAuth";
import { AuthenticatedView } from "./components/AuthenticatedView";
import TaskDetail from "./components/TaskDetail";
import {
  STATUS_COLORS,
  STATUS_LABELS,
  PRIORITY_OPTIONS,
  CATEGORY_OPTIONS,
  ENERGY_OPTIONS,
} from "./lib/constants";

type SortOption =
  | "created_desc"
  | "created_asc"
  | "due_date_asc"
  | "due_date_desc"
  | "priority_desc"
  | "priority_asc";

const SORT_OPTIONS: { value: SortOption; title: string }[] = [
  { value: "created_desc", title: "Newest First" },
  { value: "created_asc", title: "Oldest First" },
  { value: "due_date_asc", title: "Due Soon" },
  { value: "due_date_desc", title: "Due Later" },
  { value: "priority_desc", title: "High Priority" },
  { value: "priority_asc", title: "Low Priority" },
];

function sortTasks(tasks: Task[], sortBy: SortOption): Task[] {
  return [...tasks].sort((a, b) => {
    switch (sortBy) {
      case "created_desc":
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      case "created_asc":
        return (
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      case "due_date_asc": {
        // Tasks without due dates go to the end
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      }
      case "due_date_desc": {
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(b.due_date).getTime() - new Date(a.due_date).getTime();
      }
      case "priority_desc": {
        // Higher priority first, tasks without priority go to the end
        const aPriority = a.priority ?? 0;
        const bPriority = b.priority ?? 0;
        return bPriority - aPriority;
      }
      case "priority_asc": {
        // Lower priority first, tasks without priority go to the end
        const aPriority = a.priority ?? 0;
        const bPriority = b.priority ?? 0;
        if (aPriority === 0 && bPriority === 0) return 0;
        if (aPriority === 0) return 1;
        if (bPriority === 0) return -1;
        return aPriority - bPriority;
      }
      default:
        return 0;
    }
  });
}

// Helper component for ActionPanel submenus
function ActionWrapper({
  title,
  icon,
  children,
}: {
  title: string;
  icon: Image.ImageLike;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  children: any;
}) {
  return (
    <ActionPanel.Submenu title={title} icon={icon}>
      {children}
    </ActionPanel.Submenu>
  );
}

// Combined filter state to work with single dropdown
type FilterState = `${string}|${string}|${SortOption}`;

function parseFilterState(state: FilterState): {
  status: string;
  category: string;
  sort: SortOption;
} {
  const [status, category, sort] = state.split("|");
  return { status, category, sort: sort as SortOption };
}

function createFilterState(
  status: string,
  category: string,
  sort: SortOption,
): FilterState {
  return `${status}|${category}|${sort}`;
}

function FilterDropdowns({
  statusFilter,
  setStatusFilter,
  categoryFilter,
  setCategoryFilter,
  sortBy,
  setSortBy,
}: {
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  categoryFilter: string;
  setCategoryFilter: (value: string) => void;
  sortBy: SortOption;
  setSortBy: (value: SortOption) => void;
}) {
  const currentState = createFilterState(statusFilter, categoryFilter, sortBy);

  const handleChange = (newState: string) => {
    const parsed = parseFilterState(newState as FilterState);
    setStatusFilter(parsed.status);
    setCategoryFilter(parsed.category);
    setSortBy(parsed.sort);
  };

  return (
    <List.Dropdown
      tooltip="Filter & Sort"
      value={currentState}
      onChange={handleChange}
    >
      <List.Dropdown.Section title="Status">
        {["active", "all", "done", "delayed", "snoozed", "waiting"].map(
          (status) => (
            <List.Dropdown.Item
              key={`status-${status}`}
              title={`${STATUS_LABELS[status as TaskStatus] || status}${statusFilter === status ? " ✓" : ""}`}
              value={createFilterState(status, categoryFilter, sortBy)}
              icon={statusFilter === status ? Icon.CheckCircle : Icon.Circle}
            />
          ),
        )}
      </List.Dropdown.Section>
      <List.Dropdown.Section title="Category">
        <List.Dropdown.Item
          title={`All Categories${categoryFilter === "all" ? " ✓" : ""}`}
          value={createFilterState(statusFilter, "all", sortBy)}
          icon={categoryFilter === "all" ? Icon.CheckCircle : Icon.Circle}
        />
        {CATEGORY_OPTIONS.map((cat) => (
          <List.Dropdown.Item
            key={`category-${cat.value}`}
            title={`${cat.title}${categoryFilter === cat.value ? " ✓" : ""}`}
            value={createFilterState(statusFilter, cat.value, sortBy)}
            icon={categoryFilter === cat.value ? Icon.CheckCircle : Icon.Circle}
          />
        ))}
      </List.Dropdown.Section>
      <List.Dropdown.Section title="Sort By">
        {SORT_OPTIONS.map((opt) => (
          <List.Dropdown.Item
            key={`sort-${opt.value}`}
            title={`${opt.title}${sortBy === opt.value ? " ✓" : ""}`}
            value={createFilterState(statusFilter, categoryFilter, opt.value)}
            icon={sortBy === opt.value ? Icon.CheckCircle : Icon.Circle}
          />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

// Form component for editing task description
function EditDescriptionForm({
  task,
  onSave,
}: {
  task: Task;
  onSave: (task: Task, updates: Partial<Task>) => Promise<void>;
}) {
  const { pop } = useNavigation();
  const [description, setDescription] = useState(task.description || "");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit() {
    setIsLoading(true);
    try {
      await onSave(task, { description: description.trim() || null });
      pop();
    } catch {
      // Error handling is done in onSave
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={`Edit: ${task.title}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Description"
            icon={Icon.Check}
            onSubmit={handleSubmit}
          />
          <Action title="Cancel" icon={Icon.XMarkCircle} onAction={pop} />
        </ActionPanel>
      }
    >
      <Form.Description title="Task" text={task.title} />
      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Add more details about this task..."
        value={description}
        onChange={setDescription}
        enableMarkdown
      />
    </Form>
  );
}

function SearchTasksList() {
  const [searchText, setSearchText] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("active"); // Default to active (uncompleted) tasks
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("created_desc");
  const { handleSignOut } = useAuth();

  // Load tasks
  useEffect(() => {
    loadTasks();
  }, [searchText, statusFilter, categoryFilter]);

  async function loadTasks() {
    setIsLoading(true);
    try {
      const results = await searchTasks({
        search: searchText || undefined,
        status:
          statusFilter === "all" ? undefined : (statusFilter as TaskStatus),
        category:
          categoryFilter === "all"
            ? undefined
            : (categoryFilter as TaskCategory),
        limit: 50,
      });
      setTasks(results);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load tasks",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Sort tasks client-side for immediate feedback
  const sortedTasks = useMemo(() => sortTasks(tasks, sortBy), [tasks, sortBy]);

  async function handleCompleteTask(task: Task) {
    try {
      await completeTask(task.id);
      await showToast({
        style: Toast.Style.Success,
        title: "Task completed",
        message: task.title,
      });
      await loadTasks();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to complete task",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function handleSnoozeTask(task: Task) {
    try {
      await snoozeTask(task.id);
      await showToast({
        style: Toast.Style.Success,
        title: "Task snoozed",
        message: task.title,
      });
      await loadTasks();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to snooze task",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function handleUpdateTask(task: Task, updates: Partial<Task>) {
    try {
      await updateTask(task.id, updates);
      await showToast({
        style: Toast.Style.Success,
        title: "Task updated",
        message: task.title,
      });
      await loadTasks();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to update task",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function handleDeleteTask(task: Task) {
    try {
      await deleteTask(task.id);
      await showToast({
        style: Toast.Style.Success,
        title: "Task deleted",
        message: task.title,
      });
      await loadTasks();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to delete task",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search tasks..."
      searchBarAccessory={
        <FilterDropdowns
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          sortBy={sortBy}
          setSortBy={setSortBy}
        />
      }
    >
      {sortedTasks.map((task) => (
        <List.Item
          key={task.id}
          title={task.title}
          subtitle={task.category || undefined}
          accessories={
            [
              task.energy_required
                ? {
                    icon: {
                      source:
                        ENERGY_OPTIONS.find(
                          (e) => e.value === task.energy_required,
                        )?.icon || Icon.Bolt,
                      tintColor: ENERGY_OPTIONS.find(
                        (e) => e.value === task.energy_required,
                      )?.color,
                    },
                    tooltip: `Energy: ${task.energy_required}`,
                  }
                : null,
              task.priority
                ? {
                    tag: {
                      value: `P${task.priority}`,
                      color:
                        PRIORITY_OPTIONS.find(
                          (o) => o.value === task.priority?.toString(),
                        )?.color || Color.Red,
                    },
                    tooltip: "Priority",
                  }
                : null,
              task.due_date
                ? {
                    date: new Date(task.due_date),
                    tooltip: "Due date",
                  }
                : null,
              task.scheduled_date
                ? {
                    icon: Icon.Clock,
                    date: new Date(task.scheduled_date),
                    tooltip: "Scheduled date",
                  }
                : null,
            ].filter(Boolean) as List.Item.Accessory[]
          }
          icon={{
            source: task.status === "done" ? Icon.CheckCircle : Icon.Circle,
            tintColor: STATUS_COLORS[task.status],
          }}
          actions={
            <ActionPanel>
              <Action.Push
                title="Show Details"
                icon={Icon.Sidebar}
                target={
                  <TaskDetail
                    task={task}
                    actions={
                      <ActionPanel>
                        <ActionPanel.Section title="Task Actions">
                          {task.status !== "done" && (
                            <Action
                              title="Complete Task"
                              icon={Icon.Checkmark}
                              onAction={() => handleCompleteTask(task)}
                            />
                          )}
                          {task.status === "active" && (
                            <Action
                              title="Snooze Task"
                              icon={Icon.Clock}
                              onAction={() => handleSnoozeTask(task)}
                            />
                          )}
                          <Action.PickDate
                            title="Set Due Date"
                            onChange={(date) =>
                              handleUpdateTask(task, {
                                due_date: date?.toISOString(),
                              })
                            }
                          />
                          <Action.PickDate
                            title="Set Scheduled Date"
                            onChange={(date) =>
                              handleUpdateTask(task, {
                                scheduled_date: date?.toISOString(),
                              })
                            }
                          />
                        </ActionPanel.Section>

                        <ActionPanel.Section title="Edit Properties">
                          <Action.Push
                            title="Edit Description"
                            icon={Icon.Pencil}
                            target={
                              <EditDescriptionForm
                                task={task}
                                onSave={handleUpdateTask}
                              />
                            }
                            shortcut={{ modifiers: ["cmd"], key: "e" }}
                          />
                          <ActionWrapper
                            title="Change Priority"
                            icon={Icon.Tag}
                          >
                            {PRIORITY_OPTIONS.map(({ value, title }) => (
                              <Action
                                key={value}
                                title={title}
                                onAction={() =>
                                  handleUpdateTask(task, {
                                    priority: parseInt(value),
                                  })
                                }
                              />
                            ))}
                          </ActionWrapper>

                          <ActionWrapper title="Change Energy" icon={Icon.Bolt}>
                            {ENERGY_OPTIONS.map((e) => (
                              <Action
                                key={e.value}
                                title={e.title}
                                onAction={() =>
                                  handleUpdateTask(task, {
                                    energy_required: e.value,
                                  })
                                }
                              />
                            ))}
                          </ActionWrapper>

                          <ActionWrapper
                            title="Change Category"
                            icon={Icon.Folder}
                          >
                            {CATEGORY_OPTIONS.map((c) => (
                              <Action
                                key={c.value}
                                title={c.title}
                                onAction={() =>
                                  handleUpdateTask(task, { category: c.value })
                                }
                              />
                            ))}
                          </ActionWrapper>
                        </ActionPanel.Section>

                        <ActionPanel.Section title="Destructive">
                          <Action
                            title="Delete Task"
                            icon={Icon.Trash}
                            style={Action.Style.Destructive}
                            shortcut={{ modifiers: ["ctrl"], key: "x" }}
                            onAction={() => handleDeleteTask(task)}
                          />
                        </ActionPanel.Section>
                      </ActionPanel>
                    }
                  />
                }
              />
              <ActionPanel.Section title="Actions">
                {task.status !== "done" && (
                  <Action
                    title="Complete Task"
                    icon={Icon.Checkmark}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
                    onAction={() => handleCompleteTask(task)}
                  />
                )}
                {task.status === "active" && (
                  <Action
                    title="Snooze Task"
                    icon={Icon.Clock}
                    shortcut={{ modifiers: ["cmd"], key: "s" }}
                    onAction={() => handleSnoozeTask(task)}
                  />
                )}
                <Action.Push
                  title="Edit Description"
                  icon={Icon.Pencil}
                  shortcut={{ modifiers: ["cmd"], key: "e" }}
                  target={
                    <EditDescriptionForm
                      task={task}
                      onSave={handleUpdateTask}
                    />
                  }
                />
                <Action
                  title="Delete Task"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
                  onAction={() => handleDeleteTask(task)}
                />
              </ActionPanel.Section>
              <ActionPanel.Section title="Info">
                <Action.CopyToClipboard
                  title="Copy Task Title"
                  icon={Icon.Clipboard}
                  content={task.title}
                />
                {task.description && (
                  <Action.CopyToClipboard
                    title="Copy Description"
                    icon={Icon.Text}
                    content={task.description}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                  />
                )}
              </ActionPanel.Section>
              <ActionPanel.Section title="Account">
                <Action
                  title="Sign Out"
                  icon={Icon.Logout}
                  style={Action.Style.Destructive}
                  onAction={handleSignOut}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}

      {sortedTasks.length === 0 && !isLoading && (
        <List.EmptyView
          title="No tasks found"
          description={
            statusFilter === "active"
              ? "No active tasks. Create a new task or change filters."
              : "Try adjusting your search or filters"
          }
          icon={Icon.MagnifyingGlass}
        />
      )}
    </List>
  );
}

export default function SearchTasks() {
  return (
    <AuthenticatedView>
      <SearchTasksList />
    </AuthenticatedView>
  );
}
