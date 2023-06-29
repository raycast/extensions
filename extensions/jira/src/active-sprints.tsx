import { List } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { useRef, useState } from "react";

import { getProjects } from "./api/projects";
import StatusIssueList from "./components/StatusIssueList";
import { getProjectAvatar } from "./helpers/avatars";
import { withJiraCredentials } from "./helpers/withJiraCredentials";
import useIssues from "./hooks/useIssues";

export function ActiveSprints() {
  const [projectKey, setProjectKey] = useCachedState("active-sprint-project", "");
  const cachedProjectQuery = useRef(projectKey);
  const [projectQuery, setProjectQuery] = useState("");

  const { data: projects, isLoading: isLoadingProjects } = useCachedPromise(
    (query) => getProjects(query),
    [projectQuery],
    { keepPreviousData: true }
  );

  const { data: cachedProjects, isLoading: isLoadingCachedProject } = useCachedPromise(
    (query) => getProjects(query),
    [cachedProjectQuery.current],
    { keepPreviousData: true }
  );

  const jql = `sprint in openSprints() AND project = ${projectKey} ORDER BY updated DESC`;

  const { issues, isLoading: isLoadingIssues, mutate } = useIssues(jql, { execute: projectKey !== "" });

  // Filter out cached project when existing and not performing new search
  const projectsWithoutCached =
    cachedProjects?.length && projectQuery === ""
      ? projects?.filter((project) => project.id !== cachedProjects[0].id)
      : projects;
  const allProjects = [
    ...(cachedProjects && projectQuery === "" ? cachedProjects : []),
    ...(projectsWithoutCached ? projectsWithoutCached : []),
  ];

  const searchBarAccessory = (
    <List.Dropdown
      tooltip="Filter issues by project"
      onChange={setProjectKey}
      value={projectKey}
      throttle
      isLoading={cachedProjectQuery ? isLoadingCachedProject : isLoadingProjects}
      onSearchTextChange={setProjectQuery}
    >
      {allProjects?.map((project) => {
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

export default function Command() {
  return withJiraCredentials(<ActiveSprints />);
}
