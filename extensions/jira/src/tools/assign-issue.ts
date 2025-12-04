import { updateIssueAssignee } from "../api/issues";
import { withJiraCredentials } from "../helpers/withJiraCredentials";

type Input = {
  /** The ID or key of the issue to assign */
  issueIdOrKey: string;

  /** The account ID of the user to assign the issue to. Set to an empty string to unassign. */
  assigneeId?: string;

  /** The confirmation object to be displayed to the user */
  confirmation: {
    issueSummary: string;
    assigneeName: string;
  };
};

export default withJiraCredentials(async function (input: Input) {
  return updateIssueAssignee(input.issueIdOrKey, input.assigneeId || null);
});

export const confirmation = withJiraCredentials(async (input: Input) => {
  return {
    info: [
      { name: "Issue", value: input.confirmation.issueSummary },
      { name: "Key", value: input.issueIdOrKey },
      { name: "Assignee", value: input.assigneeId ? input.confirmation.assigneeName : "Unassigned" },
    ],
  };
});
