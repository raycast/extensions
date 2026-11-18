import { Color, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { gitlab } from "../common";
import { dataToProject, GitLabProjectJson, Project } from "../gitlabapi";
import { getPreferences } from "../utils";
import { GitLabIcons } from "../icons";
import { PinActions } from "./pin_actions";
import { ProjectListEmptyView, ProjectListItem, ProjectScope, usePinnedProjects } from "./project";

export function ProjectSearchList() {
  const [searchText, setSearchText] = useState<string>();
  const [scope, setScope] = useState<string>(ProjectScope.membership);
  const [pinnedProjects, setPinnedProjects] = usePinnedProjects();
  const { projects, isLoading, pagination } = useSearch(searchText, scope);
  const isMembership = scope === ProjectScope.membership;
  const isPinnedScope = scope === ProjectScope.pinned;

  const visiblePinnedProjects = useMemo(() => {
    const query = searchText?.trim().toLowerCase();
    return query
      ? pinnedProjects.filter((project) => project.name_with_namespace.toLowerCase().includes(query))
      : pinnedProjects;
  }, [pinnedProjects, searchText]);

  const unpinnedProjects = useMemo(() => {
    const pinnedIds = new Set(pinnedProjects.map((project) => project.id));
    return projects.filter((project) => !pinnedIds.has(project.id));
  }, [projects, pinnedProjects]);

  return (
    <List
      searchBarPlaceholder="Filter Projects by Name..."
      onSearchTextChange={setSearchText}
      isLoading={!isPinnedScope && isLoading}
      pagination={isPinnedScope ? undefined : pagination}
      throttle={true}
      searchBarAccessory={
        <List.Dropdown tooltip="Scope" onChange={setScope} storeValue>
          <List.Dropdown.Item title="My Projects" value={ProjectScope.membership} />
          <List.Dropdown.Item title="All" value={ProjectScope.all} />
          <List.Dropdown.Item title="Pinned" value={ProjectScope.pinned} />
        </List.Dropdown>
      }
    >
      {visiblePinnedProjects.length > 0 && (
        <List.Section title="Pinned" subtitle={`${visiblePinnedProjects.length}`}>
          {visiblePinnedProjects.map((project) => (
            <ProjectListItem
              key={project.id}
              project={project}
              showCreateQuickLink={isMembership}
              pinActions={
                <PinActions
                  item={project}
                  itemType="Project"
                  pinnedItems={pinnedProjects}
                  setPinnedItems={setPinnedProjects}
                />
              }
            />
          ))}
        </List.Section>
      )}
      {!isPinnedScope && (
        <List.Section
          title={isMembership && searchText && searchText.length > 0 ? "Search Results" : "Projects"}
          subtitle={`${unpinnedProjects.length}`}
        >
          {unpinnedProjects.map((project) => (
            <ProjectListItem
              key={project.id}
              project={project}
              showCreateQuickLink={isMembership}
              pinActions={
                <PinActions
                  item={project}
                  itemType="Project"
                  pinnedItems={pinnedProjects}
                  setPinnedItems={setPinnedProjects}
                />
              }
            />
          ))}
        </List.Section>
      )}
      {isPinnedScope ? (
        <List.EmptyView
          title="No Pinned Projects"
          description="Press ⌘. on a project to pin it"
          icon={{ source: GitLabIcons.project, tintColor: Color.PrimaryText }}
        />
      ) : (
        <ProjectListEmptyView />
      )}
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
    { initialData: [], keepPreviousData: true, execute: scope !== ProjectScope.pinned },
  );

  return { projects: data, isLoading, pagination };
}
