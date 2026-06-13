import { List } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { useState } from "react";

import { Project, getProjects } from "./api/projects";
import StatusIssueList from "./components/StatusIssueList";
import { getProjectAvatar } from "./helpers/avatars";
import { withJiraCredentials } from "./helpers/withJiraCredentials";
import useIssues from "./hooks/useIssues";

export function ActiveSprints() {
  const [cachedProject, setCachedProject] = useCachedState<Project>("active-sprint-project");
  const [projectQuery, setProjectQuery] = useState("");
  const { data: projects, isLoading: isLoadingProjects } = useCachedPromise(
    (query) => getProjects(query),
    [projectQuery],
    { keepPreviousData: true },
  );

  const jql = `sprint in openSprints() AND project = '${cachedProject?.key}' ORDER BY updated DESC`;

  const { issues, isLoading: isLoadingIssues, mutate } = useIssues(jql, { execute: cachedProject?.key !== "" });

  const isSearching = projectQuery !== "";

  const searchBarAccessory = projects ? (
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
  ) : null;

  return (
    <StatusIssueList
      issues={issues}
      isLoading={isLoadingIssues || isLoadingProjects}
      mutate={mutate}
      searchBarAccessory={searchBarAccessory}
    />
  );
}

export default withJiraCredentials(ActiveSprints);
