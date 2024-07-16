import { List } from "@raycast/api";
import { useEffect, useState } from "react";
import { gitlab } from "../common";
import { Project } from "../gitlabapi";
import { getErrorMessage, showErrorToast } from "../utils";
import { ProjectListEmptyView, ProjectListItem } from "./project";

export function ProjectSearchList(): JSX.Element {
  const [searchText, setSearchText] = useState<string>();
  const { projects, error, isLoading } = useSearch(searchText);

  if (error) {
    showErrorToast(error, "Cannot search Project");
  }

  return (
    <List
      searchBarPlaceholder="Filter Projects by Name..."
      onSearchTextChange={setSearchText}
      isLoading={isLoading}
      throttle={true}
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

export function useSearch(query: string | undefined): {
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
        const glProjects = await gitlab.getProjects({ searchText: query || "", searchIn: "title" });

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
  }, [query]);

  return { projects, error, isLoading };
}
