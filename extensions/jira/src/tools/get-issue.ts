import { getIssue } from "../api/issues";
import { withJiraCredentials } from "../helpers/withJiraCredentials";

type Input = {
  /** The ID or key of the issue to fetch */
  issueIdOrKey: string;
};

export default withJiraCredentials(async function (input: Input) {
  return getIssue(input.issueIdOrKey);
});
