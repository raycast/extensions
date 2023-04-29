import { List } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { useState } from "react";

import { getIssues } from "./api/issues";
import { getProjects } from "./api/projects";
import StatusIssueList from "./components/StatusIssueList";
import { withJiraCredentials } from "./helpers/withJiraCredentials";

export function ActiveSprints() {
  const [projectQuery, setProjectQuery] = useState("");
  const { data: projects, isLoading: isLoadingProjects } = useCachedPromise(
    (query) => getProjects(query),
    [projectQuery],
    { keepPreviousData: true }
  );

  const [projectKey, setProjectKey] = useCachedState("active-sprint-project", "");
  const jql = `sprint in openSprints() AND project = ${projectKey} ORDER BY updated DESC`;

  const {
    data: issues,
    isLoading: isLoadingIssues,
    mutate,
  } = useCachedPromise((jql) => getIssues({ jql }), [jql], { execute: projectKey !== "" });

  const searchBarAccessory = projects ? (
    <List.Dropdown
      tooltip="Filter issues by project"
      onChange={setProjectKey}
      value={projectKey}
      throttle
      isLoading={isLoadingProjects}
      onSearchTextChange={setProjectQuery}
    >
      {projects.map((project) => {
        return (
          <List.Dropdown.Item
            key={project.id}
            title={`${project.name} (${project.key})`}
            value={project.key}
            icon={project.avatarUrls["32x32"]}
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

export default function Command() {
  return withJiraCredentials(<ActiveSprints />);
}
