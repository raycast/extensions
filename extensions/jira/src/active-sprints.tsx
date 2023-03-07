import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";

import { getIssues } from "./api/issues";
import { getProjects } from "./api/projects";
import StatusIssueList from "./components/StatusIssueList";
import { withJiraCredentials } from "./helpers/withJiraCredentials";

export function ActiveSprints() {
  const { data: projects } = useCachedPromise(() => getProjects());

  const [projectKey, setProjectKey] = useState("");
  const jql = `sprint in openSprints() AND project = ${projectKey} ORDER BY updated DESC`;

  const {
    data: issues,
    isLoading,
    mutate,
  } = useCachedPromise((jql) => getIssues({ jql }), [jql], { execute: projectKey !== "" });

  const searchBarAccessory = projects ? (
    <List.Dropdown tooltip="Filter issues by project" onChange={setProjectKey} storeValue>
      {projects?.map((project) => {
        return <List.Dropdown.Item key={project.id} title={`${project.name} (${project.key})`} value={project.key} />;
      })}
    </List.Dropdown>
  ) : null;

  return (
    <StatusIssueList issues={issues} isLoading={isLoading} mutate={mutate} searchBarAccessory={searchBarAccessory} />
  );
}

export default function Command() {
  return withJiraCredentials(<ActiveSprints />);
}
