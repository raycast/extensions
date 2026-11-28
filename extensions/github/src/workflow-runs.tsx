import { RestEndpointMethodTypes } from "@octokit/rest";
import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";

import { getGitHubClient } from "./api/githubClient";
import RepositoriesDropdown from "./components/RepositoryDropdown";
import { WorkflowRun, WorkflowRunListItem } from "./components/WorkflowRunListItem";
import { withGitHubClient } from "./helpers/withGithubClient";

export type WorkflowRunsResponse = RestEndpointMethodTypes["actions"]["listWorkflowRunsForRepo"]["response"];

const WORKFLOW_RUNS_PAGE_SIZE = 25;

function WorkflowRuns() {
  const { octokit } = getGitHubClient();

  const [selectedRepository, setSelectedRepository] = useState<string | null>(null);
  const {
    data,
    isLoading,
    mutate: mutateList,
    pagination,
  } = useCachedPromise(
    (repository) =>
      async ({ cursor }) => {
        const [owner, repo] = repository.split("/");
        const page = cursor ? Number(cursor) : 1;
        const response = await octokit.actions.listWorkflowRunsForRepo({
          owner,
          repo,
          per_page: WORKFLOW_RUNS_PAGE_SIZE,
          page,
        });
        const hasMore = page * WORKFLOW_RUNS_PAGE_SIZE < response.data.total_count;

        return {
          data: response.data.workflow_runs,
          hasMore,
          cursor: hasMore ? String(page + 1) : undefined,
        };
      },
    [selectedRepository],
    { execute: !!selectedRepository },
  );

  const workflowRuns = [...new Map((data ?? []).map((workflowRun) => [workflowRun.id, workflowRun])).values()];

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter by title, branch, or commit"
      searchBarAccessory={
        <RepositoriesDropdown setSelectedRepository={setSelectedRepository} withAllRepositories={false} />
      }
      pagination={pagination}
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
