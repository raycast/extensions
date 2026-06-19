import { listPullRequests } from "../api/greptile";
import { PullRequestState, Remote } from "../types";

type Input = {
  /**
   * Repository name in owner/repo format. Omit this to list pull requests across the Greptile organization.
   */
  name?: string;
  /**
   * Optional code host for the repository. Omit this unless name is provided.
   */
  remote?: Remote;
  /**
   * Optional default branch for the repository. Omit this unless name is provided.
   */
  defaultBranch?: string;
  /**
   * Self-hosted code host URL, if the repository is not on public GitHub or GitLab. Omit this unless name is provided.
   */
  remoteUrl?: string;
  /**
   * Pull request state to filter by.
   */
  state?: PullRequestState;
  /**
   * Maximum number of pull requests to return. Use 20 by default and never exceed 100.
   */
  limit?: number;
  /**
   * Number of pull requests to skip for pagination.
   */
  offset?: number;
};

/**
 * List pull requests or merge requests known to Greptile. This is readonly.
 */
export default async function tool(input: Input = {}) {
  const response = await listPullRequests(input);

  return response.mergeRequests;
}
