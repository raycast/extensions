import { RestEndpointMethodTypes } from "@octokit/rest";
import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";

import { getGitHubClient } from "./api/githubClient";
import RepositoriesDropdown from "./components/RepositoryDropdown";
import { WorkflowRun, WorkflowRunListItem } from "./components/WorkflowRunListItem";
import { withGitHubClient } from "./helpers/withGithubClient";

export type WorkflowRunsResponse = RestEndpointMethodTypes["actions"]["listWorkflowRunsForRepo"]["response"];

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
      return octokit.actions.listWorkflowRunsForRepo({ owner, repo });
    },
    [selectedRepository],
    { execute: !!selectedRepository },
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
        ? workflowRuns.map((workflowRun: WorkflowRun) => {
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

export default withGitHubClient(WorkflowRuns);
