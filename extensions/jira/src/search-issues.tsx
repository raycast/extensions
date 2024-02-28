import { Icon, List } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { useState, useMemo } from "react";

import { Project, getProjects } from "./api/projects";
import { IssueListEmptyView } from "./components/IssueListEmptyView";
import IssueListItem from "./components/IssueListItem";
import { getProjectAvatar } from "./helpers/avatars";
import { withJiraCredentials } from "./helpers/withJiraCredentials";
import useIssues from "./hooks/useIssues";

type SearchIssuesProps = {
  query?: string;
};

export function SearchIssues({ query: initialQuery }: SearchIssuesProps) {
  const [cachedProject, setCachedProject] = useCachedState<Project>("search-issues-project");
  const [projectQuery, setProjectQuery] = useState("");
  const { data: projects, isLoading: isLoadingProjects } = useCachedPromise(
    (query) => getProjects(query),
    [projectQuery],
    { keepPreviousData: true },
  );

  const isSearching = projectQuery !== "";

  const [query, setQuery] = useState(() => {
    return initialQuery ?? "";
  });

  const jql = useMemo(() => {
    let jql = "";
    if (cachedProject) {
      jql += `project = '${cachedProject.key}' ${query !== "" ? "AND" : ""} `;
    }

    if (query === "") {
      jql += "ORDER BY created DESC";
    } else if (query.startsWith("jql:")) {
      jql += query.split("jql:")[1];
    } else {
      let issueKeyQuery = "";
      const issueKeyRegex = /\w+-\d+/;
      const matches = query.match(issueKeyRegex);
      if (matches) {
        issueKeyQuery = `OR issuekey = ${matches[0]}`;
      }

      const singleNumberRegex = /^[0-9]+$/;
      const singleNumberMatches = query.match(singleNumberRegex);
      if (singleNumberMatches && cachedProject) {
        issueKeyQuery = `OR issuekey = ${cachedProject.key}-${singleNumberMatches[0]}`;
      }

      const escapedQuery = query.replace(/[\\"]/g, "\\$&");

      // "text" by default searches in fields summary, description, environment, comments and all text custom fields.
      // Search "project" so that an issuekey prefix will be found (e.g. "APP").
      jql += `(text ~ "${escapedQuery}" OR project = "${escapedQuery}" ${issueKeyQuery}) ORDER BY updated DESC`;
    }

    return jql;
  }, [query, cachedProject]);

  const { issues, isLoading, mutate } = useIssues(jql, { keepPreviousData: true });

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Globally search issues across projects"
      onSearchTextChange={setQuery}
      searchText={query}
      throttle
      {...(projects
        ? {
            searchBarAccessory: (
              <List.Dropdown
                tooltip="Filter issues by project"
                onChange={(key) => {
                  setProjectQuery("");
                  setCachedProject(projects?.find((p) => p.key === key));
                }}
                value={cachedProject?.key ?? ""}
                throttle
                isLoading={isLoadingProjects}
                onSearchTextChange={setProjectQuery}
              >
                <List.Dropdown.Item title="All Projects" icon={Icon.List} value="" />

                {cachedProject && !isSearching ? (
                  <List.Dropdown.Item
                    key={cachedProject.key}
                    title={`${cachedProject.name} (${cachedProject.key})`}
                    value={cachedProject.key}
                    icon={getProjectAvatar(cachedProject)}
                  />
                ) : null}
                {projects
                  .filter((project) => (cachedProject && !isSearching ? project.id !== cachedProject?.id : true))
                  .map((project) => {
                    return (
                      <List.Dropdown.Item
                        key={project.id}
                        title={`${project.name} (${project.key})`}
                        value={project.key}
                        icon={getProjectAvatar(project)}
                      />
                    );
                  })}
              </List.Dropdown>
            ),
          }
        : {})}
    >
      <List.Section
        title={query.length > 0 ? "Search Results" : "Created Recently"}
        subtitle={issues && issues.length > 1 ? `${issues.length} issues` : "1 issue"}
      >
        {issues?.map((issue) => {
          return <IssueListItem key={issue.id} issue={issue} mutate={mutate} />;
        })}
      </List.Section>

      <IssueListEmptyView />
    </List>
  );
}
export default withJiraCredentials(SearchIssues);
