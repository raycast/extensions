import { List } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { useState } from "react";

import { TaskListItem } from "./components/task-list-item";
import { useWorkspaceDropdown } from "./components/with-workspace";
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
  const { tasks, isLoading: isSearching, revalidate } = useSearchTasks(workspaceId, searchText, allWorkspaceIds);
  const { projects } = useProjects(workspaceId, allWorkspaceIds);

  return (
    <List
      isLoading={isLoadingWorkspace || isSearching}
      onSearchTextChange={setSearchText}
      searchBarAccessory={dropdown}
      searchBarPlaceholder="Search tasks..."
      throttle
    >
      {searchText.length === 0 ? (
        <List.EmptyView description="Search across all your tasks" title="Type to Search" />
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
};

export default withAccessToken(oauthService)(SearchTasks);
