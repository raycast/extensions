/**
 * Search Tasks command - search across all tasks in Pinwork.
 * Supports filtering by scope (all, today, inbox, archive).
 */

import { List, Icon, ActionPanel, Action } from "@raycast/api";
import { useState } from "react";
import type { SearchScope } from "./api/types";
import { SearchScopeDisplay } from "./api/types";
import { openView } from "./api/pinwork";
import { TaskListItem } from "./components";
import { usePinworkAvailability } from "./hooks/usePinworkAvailability";
import { useTaskSearch } from "./hooks/useTaskSearch";

export default function SearchTasksCommand() {
  const [searchText, setSearchText] = useState("");
  const [scope, setScope] = useState<SearchScope>("all");

  const availability = usePinworkAvailability();
  const { tasks, isLoading, error, revalidate } = useTaskSearch(
    searchText,
    scope,
    { execute: availability.isReady },
  );

  const isBusy = availability.isLoading || isLoading;

  function handleScopeChange(newScope: string) {
    setScope(newScope as SearchScope);
  }

  async function handleRetry() {
    await availability.revalidate();
    await revalidate();
  }

  async function handleOpenPinwork() {
    await openView("today");
  }

  const activeTasks = tasks.filter((task) => !task.isCompleted);
  const completedTasks = tasks.filter((task) => task.isCompleted);

  return (
    <List
      isLoading={isBusy}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search tasks..."
      navigationTitle="Search Tasks"
      throttle
      searchBarAccessory={
        <List.Dropdown
          tooltip="Search Scope"
          value={scope}
          onChange={handleScopeChange}
        >
          {(Object.entries(SearchScopeDisplay) as [SearchScope, string][]).map(
            ([value, label]) => (
              <List.Dropdown.Item key={value} title={label} value={value} />
            ),
          )}
        </List.Dropdown>
      }
    >
      {!availability.installed ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Pinwork Not Installed"
          description="Install the Pinwork app to search tasks."
          actions={
            <ActionPanel>
              <Action title="Retry" onAction={handleRetry} />
            </ActionPanel>
          }
        />
      ) : !availability.running ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Pinwork Not Running"
          description="Open Pinwork to search tasks."
          actions={
            <ActionPanel>
              <Action title="Open Pinwork" onAction={handleOpenPinwork} />
              <Action title="Retry" onAction={handleRetry} />
            </ActionPanel>
          }
        />
      ) : error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Search Failed"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Retry" onAction={handleRetry} />
            </ActionPanel>
          }
        />
      ) : searchText.trim() === "" ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Search Tasks"
          description="Start typing to search across your tasks"
        />
      ) : tasks.length === 0 && !isBusy ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No Results"
          description={`No tasks found matching "${searchText}"`}
        />
      ) : (
        <>
          {activeTasks.length > 0 && (
            <List.Section
              title="Active"
              subtitle={`${activeTasks.length} task${
                activeTasks.length === 1 ? "" : "s"
              }`}
            >
              {activeTasks.map((task) => (
                <TaskListItem
                  key={task.id}
                  task={task}
                  onTaskUpdated={revalidate}
                />
              ))}
            </List.Section>
          )}

          {completedTasks.length > 0 && (
            <List.Section
              title="Completed"
              subtitle={`${completedTasks.length} task${
                completedTasks.length === 1 ? "" : "s"
              }`}
            >
              {completedTasks.map((task) => (
                <TaskListItem
                  key={task.id}
                  task={task}
                  onTaskUpdated={revalidate}
                />
              ))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}
