import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { gitlab } from "../common";
import { Project, searchData } from "../gitlabapi";
import { getPreferences } from "../utils";
import { ProjectListEmptyView, ProjectListItem, ProjectScope } from "./project";

export function ProjectSearchList() {
  const [searchText, setSearchText] = useState<string>();
  const [scope, setScope] = useState<string>(ProjectScope.membership);
  const { projects, isLoading } = useSearch(searchText, scope);
  const isMembership = scope === ProjectScope.membership;

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

export function useSearch(
  query: string | undefined,
  scope: string,
): {
  projects: Project[];
  isLoading: boolean;
} {
  const active = getPreferences().active ?? false;
  const isMembership = scope === ProjectScope.membership;

  const { data: membershipProjects, isLoading: membershipLoading } = useCachedPromise(
    async (limitActive: boolean): Promise<Project[]> =>
      gitlab.getUserProjects({ search: "", ...(limitActive && { active: "true" }) }, true),
    [active],
    { initialData: [], execute: isMembership },
  );

  const { data: allProjects, isLoading: allLoading } = useCachedPromise(
    async (searchQuery: string, isActive: boolean): Promise<Project[]> =>
      gitlab.getProjects({
        searchText: searchQuery,
        searchIn: "title",
        membership: "false",
        active: isActive,
      }),
    [query ?? "", active],
    { initialData: [], execute: !isMembership },
  );

  if (isMembership) {
    return {
      projects: searchData<Project[]>(membershipProjects, {
        search: query || "",
        keys: ["name_with_namespace"],
        limit: 50,
      }),
      isLoading: membershipLoading,
    };
  }

  return {
    projects: allProjects,
    isLoading: allLoading,
  };
}
