import { Icon, List } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { useState } from "react";
import { TaskListItem } from "./components/task-list-item";
import { useWorkspaceDropdown } from "./components/with-workspace";
import { useProjects } from "./hooks/use-projects";
import { useSearchTasks } from "./hooks/use-search-tasks";
import { oauthService } from "./oauth";

function SearchTasks() {
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
    isLoading: isSearching,
    error: searchTasksError,
    revalidate,
  } = useSearchTasks(workspaceId, searchText, allWorkspaceIds);
  const { projects, error: projectsError } = useProjects(workspaceId, allWorkspaceIds);
  const resultsError = searchTasksError ?? projectsError;
  const isLoading = isLoadingWorkspace || isSearching;

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarAccessory={dropdown}
      searchBarPlaceholder="Search tasks..."
      throttle
    >
      {searchText.length === 0 ? (
        <List.EmptyView description="Search across all your tasks" title="Type to Search" />
      ) : resultsError && !isLoading ? (
        <List.EmptyView
          description={resultsError instanceof Error ? resultsError.message : String(resultsError)}
          icon={Icon.ExclamationMark}
          title="Couldn’t search tasks"
        />
      ) : tasks.length === 0 ? (
        <List.EmptyView
          description="Try different keywords or pick another workspace from the accessory menu."
          title="No tasks found"
        />
      ) : (
        <List.Section subtitle={`${tasks.length} task${tasks.length === 1 ? "" : "s"}`} title="Results">
          {tasks.map((task) => (
            <TaskListItem
              key={task.id}
              projects={projects}
              revalidate={revalidate}
              showWorkspaceTag={isAllWorkspaces}
              task={task}
              workspaces={workspaces}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

export default withAccessToken(oauthService)(SearchTasks);
