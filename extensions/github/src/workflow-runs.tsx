import { Endpoints } from "@octokit/types";
import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";

import RepositoriesDropdown from "./components/RepositoryDropdown";
import View from "./components/View";
import { WorkflowRunListItem } from "./components/WorkflowRunListItem";
import { getGitHubClient } from "./helpers/withGithubClient";

export type WorkflowRunsResponse = Endpoints["GET /repos/{owner}/{repo}/actions/runs"]["response"];

function WorkflowRuns() {
  const { octokit } = getGitHubClient();

  const [selectedRepository, setSelectedRepository] = useState<string | null>(null);
  const {
    data,
    isLoading,
    mutate: mutateList,
  } = useCachedPromise(
    (repository) => {
      const [owner, repo] = repository.split("/");
      return octokit.rest.actions.listWorkflowRunsForRepo({ owner, repo });
    },
    [selectedRepository],
    { execute: !!selectedRepository }
  );

  const workflowRuns = data?.data.workflow_runs;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter by title, branch, or commit"
      searchBarAccessory={
        <RepositoriesDropdown setSelectedRepository={setSelectedRepository} withAllRepositories={false} />
      }
    >
      {workflowRuns && workflowRuns.length > 0
        ? workflowRuns.map((workflowRun) => {
            return (
              <WorkflowRunListItem
                key={workflowRun.id}
                workflowRun={workflowRun}
                repository={workflowRun.repository.full_name}
                mutateList={mutateList}
              />
            );
          })
        : null}

      <List.EmptyView title="No recent workflow runs found" />
    </List>
  );
}

export default function Command() {
  return (
    <View>
      <WorkflowRuns />
    </View>
  );
}
