import { ActionPanel, Action, Icon, List, Color } from "@raycast/api";
import { useState, useEffect, useMemo } from "react";
import { useSearchAllTasks } from "./hooks/useSearchAllTasks";
import { useWorkspaces } from "./hooks/useWorkspaces";
import withAsanaAuth from "./components/withAsanaAuth";
import TaskListItem from "./components/TaskListItem";
import CreateTaskForm from "./components/CreateTaskForm";
import { searchProjects, SearchProject } from "./api/projects";
import { useCachedPromise } from "@raycast/utils";
import { handleUseCachedPromiseError } from "./helpers/errors";
import { asanaToRaycastColor } from "./helpers/colors";

function useSearchProjects(workspace: string, query: string) {
  return useCachedPromise((ws, q) => searchProjects(ws, q), [workspace, query], {
    execute: !!workspace && query.length > 0,
    onError(error) {
      handleUseCachedPromiseError(error);
    },
  });
}

function SearchTasks() {
  const [workspace, setWorkspace] = useState<string>("");
  const [searchText, setSearchText] = useState("");

  const { data: workspaces, isLoading: isLoadingWorkspaces } = useWorkspaces();
  const { data: tasks, isLoading: isLoadingTasks, mutate: mutateList } = useSearchAllTasks(workspace, searchText);
  const { data: projects, isLoading: isLoadingProjects } = useSearchProjects(workspace, searchText);

  useEffect(() => {
    if (workspaces?.length === 1) {
      setWorkspace(workspaces[0].gid);
    }
  }, [workspaces]);

  const sortedProjects = useMemo(() => {
    if (!projects) return [];
    return [...projects].sort((a, b) => (b.modified_at || "").localeCompare(a.modified_at || ""));
  }, [projects]);

  const sortedTasks = useMemo(() => {
    if (!tasks) return [];
    return [...tasks].sort((a, b) => (b.modified_at || "").localeCompare(a.modified_at || ""));
  }, [tasks]);

  return (
    <List
      searchBarPlaceholder="Search tasks and projects..."
      isLoading={isLoadingWorkspaces || isLoadingTasks || isLoadingProjects}
      filtering={false}
      onSearchTextChange={setSearchText}
      throttle
      {...(workspaces && workspaces.length > 1
        ? {
            searchBarAccessory: (
              <List.Dropdown tooltip="Change Workspace" onChange={setWorkspace} storeValue>
                {workspaces?.map((ws) => (
                  <List.Dropdown.Item key={ws.gid} value={ws.gid} title={ws.name} />
                ))}
              </List.Dropdown>
            ),
          }
        : {})}
    >
      {searchText.length === 0 ? (
        <List.EmptyView title="Search" description="Type to search tasks and projects in your workspace." />
      ) : (
        <>
          {sortedProjects.length > 0 && (
            <List.Section title="Projects" subtitle={`${sortedProjects.length}`}>
              {sortedProjects.map((project) => (
                <ProjectListItem key={project.gid} project={project} />
              ))}
            </List.Section>
          )}

          <List.Section title="Tasks" subtitle={`${sortedTasks.length}`}>
            {sortedTasks.map((task) => (
              <TaskListItem key={task.gid} task={task} workspace={workspace} mutateList={mutateList} />
            ))}
          </List.Section>

          {sortedProjects.length === 0 && sortedTasks.length === 0 && (
            <List.EmptyView
              title="No results found"
              description="No tasks or projects match your search."
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Create Task"
                    target={<CreateTaskForm workspace={workspace} fromEmptyView={true} />}
                  />
                </ActionPanel>
              }
            />
          )}
        </>
      )}
    </List>
  );
}

function ProjectListItem({ project }: { project: SearchProject }) {
  return (
    <List.Item
      icon={{
        source: project.icon ? `asana-project-icon-${project.icon}-16.svg` : Icon.List,
        tintColor: project.color ? asanaToRaycastColor(project.color) : Color.PrimaryText,
      }}
      title={project.name}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in Asana" url={project.permalink_url} />
        </ActionPanel>
      }
    />
  );
}

export default withAsanaAuth(SearchTasks);
