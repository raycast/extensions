import { listCodeReviews } from "../api/greptile";
import { CodeReviewStatus, Remote } from "../types";

type Input = {
  /**
   * Repository name in owner/repo format. Omit this to list reviews across the Greptile organization.
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
   * Pull request number to filter reviews by. Omit this unless the user gives a positive PR number.
   */
  prNumber?: number;
  /**
   * Greptile code review status to filter by.
   */
  status?: CodeReviewStatus;
  /**
   * Maximum number of code reviews to return. Use 20 by default and never exceed 100.
   */
  limit?: number;
  /**
   * Number of code reviews to skip for pagination.
   */
  offset?: number;
};

/**
 * List Greptile code review runs. This is readonly.
 */
export default async function tool(input: Input = {}) {
  const response = await listCodeReviews(input);

  return response.codeReviews;
}
