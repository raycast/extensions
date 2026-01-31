import {
  List,
  showToast,
  Toast,
  ActionPanel,
  Action,
  Icon,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { Task, FilterOptions } from "./types";
import {
  fetchTasks,
  toggleTaskStatus,
  fetchFilterOptions,
  FetchTasksFilters,
} from "./api/client";
import { getCachedTasks } from "./cache";

export default function ViewTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [projectFilter, setProjectFilter] = useState<string>("");
  const [tagFilter, setTagFilter] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(
    null,
  );

  useEffect(() => {
    async function loadInitialData() {
      setIsLoading(true);
      try {
        const [tasksResult, optionsResult] = await Promise.all([
          fetchTasks({ completed: false }),
          fetchFilterOptions(),
        ]);
        setTasks(tasksResult);
        setFilterOptions(optionsResult);
      } catch {
        const cached = await getCachedTasks();
        if (cached) {
          const openTasks = cached.filter((t) => t.status !== "done");
          setTasks(openTasks);
        }
      } finally {
        setIsLoading(false);
      }
    }
    loadInitialData();
  }, []);

  useEffect(() => {
    if (!filterOptions) return;

    async function applyFilters() {
      setIsLoading(true);
      try {
        const filters: FetchTasksFilters = { completed: false };
        if (projectFilter) filters.project = projectFilter;
        if (tagFilter) filters.tag = tagFilter;
        if (priorityFilter) filters.priority = priorityFilter;

        const result = await fetchTasks(filters);
        setTasks(result);
      } catch {
        // Keep current tasks on error
      } finally {
        setIsLoading(false);
      }
    }
    applyFilters();
  }, [projectFilter, tagFilter, priorityFilter, filterOptions]);

  const filteredTasks = tasks.filter((t) =>
    t.title.toLowerCase().includes(searchText.toLowerCase()),
  );

  const activeFilters = [
    projectFilter && `Project: ${projectFilter}`,
    tagFilter && `Tag: ${tagFilter}`,
    priorityFilter && `Priority: ${priorityFilter}`,
  ]
    .filter(Boolean)
    .join(" | ");

  function clearAllFilters() {
    setProjectFilter("");
    setTagFilter("");
    setPriorityFilter("");
  }

  function getAccessories(task: Task): List.Item.Accessory[] {
    const accessories: List.Item.Accessory[] = [];

    if (task.tags && task.tags.length > 0) {
      for (const tagName of task.tags.slice(0, 3)) {
        accessories.push({ tag: { value: tagName } });
      }
    }

    if (task.priority && task.priority !== "none") {
      accessories.push({ text: task.priority });
    }

    if (task.due) {
      accessories.push({ text: task.due });
    }

    return accessories;
  }

  async function handleCompleteTask(task: Task) {
    await showToast({
      style: Toast.Style.Animated,
      title: "Marking complete...",
    });

    setTasks((prev) => prev.filter((t) => t.id !== task.id));

    try {
      await toggleTaskStatus(task.id);
      await showToast({
        style: Toast.Style.Success,
        title: "Task completed",
        message: task.title,
      });
    } catch (error) {
      setTasks((prev) =>
        [...prev, task].sort((a, b) => a.title.localeCompare(b.title)),
      );

      const message =
        error && typeof error === "object" && "message" in error
          ? (error as { message: string }).message
          : "Failed to complete task";

      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: message,
      });
    }
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search tasks..."
      navigationTitle={activeFilters || "View Tasks"}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Project"
          value={projectFilter}
          onChange={setProjectFilter}
        >
          <List.Dropdown.Item title="All Projects" value="" />
          {filterOptions?.projects.map((p) => (
            <List.Dropdown.Item key={p} title={p} value={p} />
          ))}
        </List.Dropdown>
      }
    >
      {filteredTasks.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No tasks found"
          description="All caught up! No open tasks."
        />
      ) : (
        filteredTasks.map((task) => (
          <List.Item
            key={task.id}
            title={task.title}
            subtitle={task.projects?.[0]?.replace(/^\[\[|\]\]$/g, "")}
            accessories={getAccessories(task)}
            actions={
              <ActionPanel>
                <Action
                  title="Complete Task"
                  icon={Icon.Checkmark}
                  onAction={() => handleCompleteTask(task)}
                />
                <ActionPanel.Section title="Filters">
                  <ActionPanel.Submenu title="Filter by Tag" icon={Icon.Tag}>
                    <Action
                      title="All Tags"
                      onAction={() => setTagFilter("")}
                    />
                    {filterOptions?.tags.map((tag) => (
                      <Action
                        key={tag}
                        title={tag}
                        onAction={() => setTagFilter(tag)}
                      />
                    ))}
                  </ActionPanel.Submenu>
                  <ActionPanel.Submenu
                    title="Filter by Priority"
                    icon={Icon.Signal3}
                  >
                    <Action
                      title="All Priorities"
                      onAction={() => setPriorityFilter("")}
                    />
                    {filterOptions?.priorities.map((p) => (
                      <Action
                        key={p.id}
                        title={p.label}
                        onAction={() => setPriorityFilter(p.value)}
                      />
                    ))}
                  </ActionPanel.Submenu>
                  <Action
                    title="Clear All Filters"
                    icon={Icon.XMarkCircle}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
                    onAction={clearAllFilters}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
