import { List } from "@raycast/api";
import { useEffect, useState } from "react";
import { gitlab } from "../common";
import { Project } from "../gitlabapi";
import { getErrorMessage, showErrorToast } from "../utils";
import { ProjectListEmptyView, ProjectListItem, ProjectScope } from "./project";

export function ProjectSearchList() {
  const [searchText, setSearchText] = useState<string>();
  const [scope, setScope] = useState<string>(ProjectScope.membership);
  const { projects, error, isLoading } = useSearch(searchText, scope);

  if (error) {
    showErrorToast(error, "Cannot search Project");
  }

  return (
    <List
      searchBarPlaceholder="Filter Projects by Name..."
      onSearchTextChange={setSearchText}
      isLoading={isLoading}
      throttle={true}
      searchBarAccessory={
        <List.Dropdown tooltip="Scope" onChange={setScope} storeValue>
          <List.Dropdown.Item title="My Projects" value={ProjectScope.membership} />
          <List.Dropdown.Item title="All" value={ProjectScope.all} />
        </List.Dropdown>
      }
    >
      <List.Section title="Projects" subtitle={`${projects?.length}`}>
        {projects?.map((project) => (
          <ProjectListItem key={project.id} project={project} />
        ))}
      </List.Section>
      <ProjectListEmptyView />
    </List>
  );
}

export function useSearch(
  query: string | undefined,
  scope: string,
): {
  projects?: Project[];
  error?: string;
  isLoading: boolean;
} {
  const [projects, setProjects] = useState<Project[]>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // FIXME In the future version, we don't need didUnmount checking
    // https://github.com/facebook/react/pull/22114
    let didUnmount = false;

    async function fetchData() {
      if (query === null || didUnmount) {
        return;
      }

      setIsLoading(true);
      setError(undefined);

      try {
        const membership = scope === ProjectScope.membership ? "true" : "false";
        const glProjects = await gitlab.getProjects({ searchText: query || "", searchIn: "title", membership });

        if (!didUnmount) {
          setProjects(glProjects);
        }
      } catch (e) {
        if (!didUnmount) {
          setError(getErrorMessage(e));
        }
      } finally {
        if (!didUnmount) {
          setIsLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      didUnmount = true;
    };
  }, [query, scope]);

  return { projects, error, isLoading };
}
