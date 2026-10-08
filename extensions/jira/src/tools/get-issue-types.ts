import { getCreateIssueMetadataSummary } from "../api/issues";
import { withJiraCredentials } from "../helpers/withJiraCredentials";

type Input = {
  /** The project's ID to get issue types for */
  projectId: string;
};

export default withJiraCredentials(async function (input: Input) {
  const result = await getCreateIssueMetadataSummary(input.projectId);
  // We only query one project in the getCreateIssueMetadata call
  // It's safe to assume the issue types will always correspond to the first element
  const issueTypes = result?.[0]?.issuetypes;
  // filter out the iconUrl to avoid bloating the AI
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const formattedIssueTypes = issueTypes?.map(({ iconUrl, ...issueType }) => issueType);

  return formattedIssueTypes;
});
