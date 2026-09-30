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

  return octokit.actions.cancelWorkflowRun({ run_id: workflowRun.id, owner, repo });
});
