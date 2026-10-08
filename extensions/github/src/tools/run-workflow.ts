import { getGitHubClient } from "../api/githubClient";
import { withGitHubClient } from "../helpers/withGithubClient";

type Input = {
  owner: string;
  repo: string;

  /**
   *  The ID of the workflow. You can also pass the workflow file name as a string.
   */
  workflowId: string;
  /**
   * The git reference for the workflow. The reference can be a branch or tag name.
   */
  ref: string;

  /**
   * Input keys and values configured in the workflow file. The maximum number of properties is 10. Any default properties configured in the workflow file will be used when inputs are omitted.
   *  Use JSON string
   */
  inputs?: string;
};

type WorkflowDispatchParams = {
  owner: string;
  repo: string;
  workflow_id: string;
  ref: string;
  inputs?: Record<string, unknown>;
};

export default withGitHubClient(async ({ owner, repo, workflowId, ref, inputs }: Input) => {
  const { octokit } = getGitHubClient();

  let params: WorkflowDispatchParams = {
    owner,
    repo,
    workflow_id: workflowId,
    ref,
  };

  if (inputs) {
    params = {
      ...params,
      inputs: JSON.parse(inputs),
    };
  }

  return octokit.actions.createWorkflowDispatch(params);
});
