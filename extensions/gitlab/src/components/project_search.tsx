import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { gitlab } from "../common";
import { dataToProject, GitLabProjectJson, Project } from "../gitlabapi";
import { getPreferences } from "../utils";
import { ProjectListEmptyView, ProjectListItem, ProjectScope } from "./project";

export function ProjectSearchList() {
  const [searchText, setSearchText] = useState<string>();
  const [scope, setScope] = useState<string>(ProjectScope.membership);
  const { projects, isLoading, pagination } = useSearch(searchText, scope);
  const isMembership = scope === ProjectScope.membership;

  return (
    <List
      searchBarPlaceholder="Filter Projects by Name..."
      onSearchTextChange={setSearchText}
      isLoading={isLoading}
      pagination={pagination}
      throttle={true}
      searchBarAccessory={
        <List.Dropdown tooltip="Scope" onChange={setScope} storeValue>
          <List.Dropdown.Item title="My Projects" value={ProjectScope.membership} />
          <List.Dropdown.Item title="All" value={ProjectScope.all} />
        </List.Dropdown>
      }
    >
      <List.Section
        title={isMembership && searchText && searchText.length > 0 ? "Search Results" : "Projects"}
        subtitle={`${projects.length}`}
      >
        {projects.map((project) => (
          <ProjectListItem key={project.id} project={project} showCreateQuickLink={isMembership} />
        ))}
      </List.Section>
      <ProjectListEmptyView />
    </List>
  );
}

const PROJECT_SEARCH_PAGE_SIZE = 30;

export function useSearch(
  query: string | undefined,
  scope: string,
): {
  projects: Project[];
  isLoading: boolean;
  pagination: List.Props["pagination"];
} {
  const { data, isLoading, pagination } = useCachedPromise(
    (searchQuery: string, projectScope: string, active: boolean) =>
      async ({ page }: { page: number }) => {
        const { data, hasMore } = await gitlab.fetchPaged(
          "projects",
          {
            ...(projectScope === ProjectScope.membership
              ? { min_access_level: "30", ...(searchQuery && { search: searchQuery, search_namespaces: "true" }) }
              : { membership: "false", ...(searchQuery && { search: searchQuery, in: "title" }) }),
            ...(active && { active: "true" }),
          },
          page + 1,
          PROJECT_SEARCH_PAGE_SIZE,
        );
        return { data: ((data as GitLabProjectJson[]) ?? []).map(dataToProject), hasMore };
      },
    [query ?? "", scope, getPreferences().active ?? false],
    { initialData: [], keepPreviousData: true },
  );

  return { projects: data, isLoading, pagination };
}
