import { Icon, List } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { useState } from "react";

import { Project, getProjects } from "./api/projects";
import { IssueListEmptyView } from "./components/IssueListEmptyView";
import IssueListFallback from "./components/IssueListFallback";
import IssueListItem from "./components/IssueListItem";
import { getProjectAvatar } from "./helpers/avatars";
import { withProjectFilter } from "./helpers/jql";
import { withJiraCredentials } from "./helpers/withJiraCredentials";
import useIssues from "./hooks/useIssues";

export function RecentlyUpdatedIssues() {
  const [query, setQuery] = useState("");
  const [cachedProject, setCachedProject] = useCachedState<Project | undefined>("recently-updated-project");
  const [projectQuery, setProjectQuery] = useState("");
  const { data: projects, isLoading: isLoadingProjects } = useCachedPromise(
    (query) => getProjects(query),
    [projectQuery],
    { keepPreviousData: true },
  );

  const showFallbackCommand = query.length > 0;
  const isSearchingProjects = projectQuery !== "";

  const jql = withProjectFilter("updated >= -1w ORDER BY updated DESC", cachedProject?.key);
  const { issues, isLoading, mutate } = useIssues(jql);

  const projectFilter = projects ? (
    <List.Dropdown
      tooltip="Filter recently updated issues by project"
      value={cachedProject?.key ?? ""}
      isLoading={isLoadingProjects}
      throttle
      onSearchTextChange={setProjectQuery}
      onChange={(key) => {
        setProjectQuery("");
        setCachedProject(key ? projects.find((project) => project.key === key) : undefined);
      }}
    >
      <List.Dropdown.Item title="All Projects" icon={Icon.List} value="" />
      {cachedProject && !isSearchingProjects ? (
        <List.Dropdown.Item
          key={cachedProject.id}
          title={`${cachedProject.name} (${cachedProject.key})`}
          value={cachedProject.key}
          icon={getProjectAvatar(cachedProject)}
        />
      ) : null}
      {projects
        .filter((project) => (cachedProject && !isSearchingProjects ? project.id !== cachedProject.id : true))
        .map((project) => (
          <List.Dropdown.Item
            key={project.id}
            title={`${project.name} (${project.key})`}
            value={project.key}
            icon={getProjectAvatar(project)}
          />
        ))}
    </List.Dropdown>
  ) : null;

  return (
    <List
      isLoading={isLoading || isLoadingProjects}
      searchBarPlaceholder="Filter by key, summary, status, type, assignee or priority"
      searchText={query}
      onSearchTextChange={setQuery}
      filtering={{ keepSectionOrder: true }}
      searchBarAccessory={projectFilter}
    >
      <List.Section
        title="Updated Recently"
        subtitle={issues && issues.length > 1 ? `${issues.length} issues` : "1 issue"}
      >
        {issues?.map((issue) => {
          return <IssueListItem key={issue.id} issue={issue} mutate={mutate} />;
        })}
      </List.Section>

      {showFallbackCommand ? <IssueListFallback query={query} /> : null}

      <IssueListEmptyView />
    </List>
  );
}

export default withJiraCredentials(RecentlyUpdatedIssues);
