import { getCreateIssueMetadataSummary } from "../api/issues";
import { withJiraCredentials } from "../helpers/withJiraCredentials";

type Input = {
  /** The project's ID to get issue types for */
  projectId: string;
};

export default withJiraCredentials(async function (input: Input) {
  const issueTypes = await getCreateIssueMetadataSummary(input.projectId);
  // Filter out iconUrl to avoid bloating the AI context
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return issueTypes?.map(({ iconUrl, ...issueType }) => issueType);
});
