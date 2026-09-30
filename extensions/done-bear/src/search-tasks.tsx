import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { useState } from "react";

import { TaskListItem } from "./components/task-list-item";
import { useWorkspaceDropdown } from "./components/with-workspace";
import { QuickAddAction } from "./components/quick-add-action";
import { useProjects } from "./hooks/use-projects";
import { useSearchTasks } from "./hooks/use-search-tasks";
import { oauthService } from "./oauth";

const SearchTasks = () => {
  const [searchText, setSearchText] = useState("");
  const {
    workspaceId,
    allWorkspaceIds,
    isAllWorkspaces,
    workspaces,
    isLoading: isLoadingWorkspace,
    dropdown,
  } = useWorkspaceDropdown();
  const {
    tasks,
    error: tasksError,
    isLoading: isSearching,
    revalidate: revalidateTasks,
  } = useSearchTasks(workspaceId, searchText, allWorkspaceIds);
  const {
    projects,
    error: projectsError,
    isLoading: isLoadingProjects,
    revalidate: revalidateProjects,
  } = useProjects(workspaceId, allWorkspaceIds);
  const fetchError = tasksError ?? projectsError;

  const handleRetry = async () => {
    await Promise.all([revalidateTasks(), revalidateProjects()]);
  };

  return (
    <List
      isLoading={isLoadingWorkspace || isSearching || isLoadingProjects}
      onSearchTextChange={setSearchText}
      searchBarAccessory={dropdown}
      searchBarPlaceholder="Search tasks..."
      searchText={searchText}
      throttle
    >
      {fetchError ? (
        <List.EmptyView
          actions={
            <ActionPanel>
              <Action icon={Icon.ArrowClockwise} onAction={handleRetry} title="Retry Search" />
            </ActionPanel>
          }
          description="Check your connection and try again."
          icon={Icon.Warning}
          title="Search couldn't load"
        />
      ) : searchText.length === 0 ? (
        <List.EmptyView
          actions={
            <ActionPanel>
              <QuickAddAction />
            </ActionPanel>
          }
          description="Search every workspace, project, and task title."
          icon={Icon.MagnifyingGlass}
          title="Find a task"
        />
      ) : tasks.length === 0 && !isSearching ? (
        <List.EmptyView
          actions={
            <ActionPanel>
              <QuickAddAction initialValue={searchText} onCreated={revalidateTasks} title="Create as Task" />
              <Action icon={Icon.XMarkCircle} onAction={() => setSearchText("")} title="Clear Search" />
            </ActionPanel>
          }
          description="Create it as a task or try another search."
          icon={Icon.MagnifyingGlass}
          title={`No tasks match “${searchText}”`}
        />
      ) : (
        <List.Section subtitle={`${tasks.length} task${tasks.length === 1 ? "" : "s"}`} title="Results">
          {tasks.map((task) => (
            <TaskListItem
              key={task.id}
              projects={projects}
              revalidate={revalidateTasks}
              showWorkspaceTag={isAllWorkspaces}
              task={task}
              workspaces={workspaces}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
};

export default withAccessToken(oauthService)(SearchTasks);
