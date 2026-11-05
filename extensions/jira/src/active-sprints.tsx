import { List } from "@raycast/api";
import { useState } from "react";

import { Project, getProjects } from "./api/projects";
import StatusIssueList from "./components/StatusIssueList";
import { getProjectAvatar } from "./helpers/avatars";
import { sanitizeJqlIdentifier, withProjectFilter } from "./helpers/jql";
import { withJiraCredentials } from "./helpers/withJiraCredentials";
import { useJiraCachedPromise, useJiraCachedState } from "./hooks/useJiraCache";
import useIssues from "./hooks/useIssues";

export function ActiveSprints() {
  const [cachedProject, setCachedProject] = useJiraCachedState<Project>("active-sprint-project");
  const [projectQuery, setProjectQuery] = useState("");
  const { data: projects, isLoading: isLoadingProjects } = useJiraCachedPromise(
    (query) => getProjects(query),
    [projectQuery],
    { keepPreviousData: true },
  );

  const jql = withProjectFilter("sprint in openSprints() ORDER BY updated DESC", cachedProject?.key);

  const safeProjectKey = sanitizeJqlIdentifier(cachedProject?.key);
  const { issues, isLoading: isLoadingIssues, mutate } = useIssues(jql, { execute: safeProjectKey !== undefined });

  const searchBarAccessory = (
    <List.Dropdown
      tooltip="Filter issues by project"
      onChange={(key) => {
        const project = projects?.find((p) => p.key === key);
        if (!project) return;
        setProjectQuery("");
        setCachedProject(project);
      }}
      value={cachedProject?.key ?? ""}
      throttle
      isLoading={isLoadingProjects}
      onSearchTextChange={setProjectQuery}
    >
      {cachedProject ? (
        <List.Dropdown.Item
          key={cachedProject.key}
          title={`${cachedProject.name} (${cachedProject.key})`}
          value={cachedProject.key}
          icon={getProjectAvatar(cachedProject)}
        />
      ) : null}
      {!projects?.length ? (
        <List.Dropdown.Item title={isLoadingProjects ? "Loading projects..." : "No projects found"} value="" />
      ) : null}
      {projects
        ?.filter((project) => project.id !== cachedProject?.id)
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
  );

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
