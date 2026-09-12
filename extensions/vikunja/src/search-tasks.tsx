import {
  List,
  showToast,
  Toast,
  confirmAlert,
  getPreferenceValues,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import {
  searchTasks,
  getProjects,
  toggleTaskDone,
  deleteTask,
  Task,
} from "./api";
import { TaskListItem } from "./components/task-list-item";

export default function SearchTasks() {
  const [searchText, setSearchText] = useState("");

  const { apiUrl } = getPreferenceValues<Preferences>();
  const baseUrl = apiUrl.replace(/\/+$/, "");

  const { data: projects } = useCachedPromise(getProjects, [], {
    keepPreviousData: true,
  });

  const {
    data: tasks,
    isLoading,
    revalidate,
  } = useCachedPromise((query: string) => searchTasks(query), [searchText], {
    keepPreviousData: true,
    execute: searchText.length > 0,
  });

  async function handleToggleDone(task: Task) {
    try {
      await toggleTaskDone(task);
      showToast({
        style: Toast.Style.Success,
        title: task.done ? "Task reopened" : "Task completed",
      });
      revalidate();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to update task",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function handleDelete(task: Task) {
    if (
      await confirmAlert({
        title: `Delete "${task.title}"?`,
        message: "This cannot be undone.",
      })
    ) {
      try {
        await deleteTask(task.id);
        showToast({ style: Toast.Style.Success, title: "Task deleted" });
        revalidate();
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to delete task",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  }

  const taskList = tasks ?? [];
  const projectList = projects ?? [];
  const openTasks = taskList.filter((t) => !t.done);
  const doneTasks = taskList.filter((t) => t.done);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search tasks..."
      onSearchTextChange={setSearchText}
      throttle
    >
      {searchText.length === 0 ? (
        <List.EmptyView
          title="Search Vikunja Tasks"
          description="Start typing to search across all your tasks"
        />
      ) : taskList.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No Results"
          description={`No tasks found for "${searchText}"`}
        />
      ) : (
        <>
          <List.Section title="Open" subtitle={`${openTasks.length} tasks`}>
            {openTasks.map((task) => (
              <TaskListItem
                key={task.id}
                task={task}
                baseUrl={baseUrl}
                projects={projectList}
                onToggleDone={handleToggleDone}
                onDelete={handleDelete}
                onRefresh={revalidate}
              />
            ))}
          </List.Section>
          {doneTasks.length > 0 && (
            <List.Section title="Done" subtitle={`${doneTasks.length} tasks`}>
              {doneTasks.map((task) => (
                <TaskListItem
                  key={task.id}
                  task={task}
                  baseUrl={baseUrl}
                  projects={projectList}
                  onToggleDone={handleToggleDone}
                  onDelete={handleDelete}
                  onRefresh={revalidate}
                />
              ))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}
