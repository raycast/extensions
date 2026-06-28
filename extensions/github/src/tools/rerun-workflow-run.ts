import { getGitHubClient } from "../api/githubClient";
import { withGitHubClient } from "../helpers/withGithubClient";

type Input = {
  owner: string;
  repo: string;
  runId: string;
};

export default withGitHubClient(async ({ runId, owner, repo }: Input) => {
  const { octokit } = getGitHubClient();

  const { data: workflowRun } = await octokit.actions.getWorkflowRun({ run_id: parseInt(runId), owner, repo });

  if (workflowRun.status === "completed") {
    return octokit.actions.reRunWorkflow({ run_id: workflowRun.id, owner, repo });
  } else {
    return octokit.actions.reRunWorkflowFailedJobs({ run_id: workflowRun.id, owner, repo });
  }
});
