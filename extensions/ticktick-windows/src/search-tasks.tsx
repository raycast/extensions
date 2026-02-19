import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { useAllTasks } from "./hooks/useTasks";
import { useProjects } from "./hooks/useProjects";
import { TaskListItem } from "./components/TaskListItem";
import { TaskForm } from "./components/TaskForm";

export default function SearchTasksCommand() {
  const { tasks, isLoading: tasksLoading, revalidate, error } = useAllTasks();
  const { projects, isLoading: projectsLoading } = useProjects();
  const [searchText, setSearchText] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load tasks",
        message: String(error),
      });
    }
  }, [error]);

  const isLoading = tasksLoading || projectsLoading;

  const filtered = useMemo(
    () =>
      tasks.filter((t) => {
        if (t.status !== 0) return false;
        if (
          searchText &&
          !t.title.toLowerCase().includes(searchText.toLowerCase()) &&
          !t.content?.toLowerCase().includes(searchText.toLowerCase())
        )
          return false;
        if (projectFilter === "inbox" && t.projectId) return false;
        if (
          projectFilter !== "all" &&
          projectFilter !== "inbox" &&
          t.projectId !== projectFilter
        )
          return false;
        return true;
      }),
    [tasks, searchText, projectFilter],
  );

  // Only show section header after loading completes, so the "Results · 0"
  // label doesn't flash while tasks are still fetching.
  const showResults = !isLoading || filtered.length > 0;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search tasks by title or notes..."
      onSearchTextChange={setSearchText}
      throttle
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Project"
          value={projectFilter}
          onChange={setProjectFilter}
        >
          <List.Dropdown.Item
            title="All Projects"
            value="all"
            icon={Icon.List}
          />
          <List.Dropdown.Item title="Inbox" value="inbox" icon={Icon.Tray} />
          {projects.map((p) => (
            <List.Dropdown.Item
              key={p.id}
              title={p.name}
              value={p.id}
              icon={{ source: Icon.Folder, tintColor: p.color ?? undefined }}
            />
          ))}
        </List.Dropdown>
      }
    >
      {filtered.length === 0 && !isLoading && (
        <List.EmptyView
          icon={{
            source: Icon.MagnifyingGlass,
            tintColor: Color.SecondaryText,
          }}
          title={searchText ? "No matching tasks" : "No tasks found"}
          description={
            searchText
              ? "Try different keywords or change the project filter"
              : "Press Enter on the action panel to create your first task"
          }
          actions={
            <ActionPanel>
              <Action.Push
                title="New Task"
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                target={<TaskForm projects={projects} onSubmit={revalidate} />}
              />
            </ActionPanel>
          }
        />
      )}

      {showResults && filtered.length > 0 && (
        <List.Section
          title="Results"
          subtitle={`${filtered.length} task${filtered.length !== 1 ? "s" : ""}`}
        >
          {filtered.map((task) => (
            <TaskListItem
              key={task.id}
              task={task}
              projects={projects}
              onRefresh={revalidate}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
