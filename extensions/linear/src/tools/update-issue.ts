import { withAccessToken } from "@raycast/utils";

import { getLinearClient, linear } from "../api/linearClient";
import { updateIssue } from "../api/updateIssue";

import { formatConfirmation } from "./formatConfirmation";

type Input = {
  /**
   * The id of the State (issue or 'workflow' status) of the issue.
   * If an issue is created without a specified stateId (the status field for the issue), the issue will be assigned to the team's first state in the Backlog workflow state category.
   * If the "Triage" feature is turned on for the team, then the issue will be assigned to the Triage workflow state.
   */
  stateId?: string;

  /** The ID of the parent issue */
  parentId?: string;

  /** The ID of the user to assign the issue to */
  assigneeId?: string;

  /** The ID of the issue to update */
  issueId: string;

  /** The ID of the project milestone the issue belongs to */
  projectMilestoneId?: string;

  /** The priority of the issue (0-4, where 0 is no priority and 4 is urgent) */
  priority?: number;

  /** The due date of the issue in ISO date format (e.g., '2023-12-31') */
  dueDate?: string;

  /** The estimate of the issue using a 0-5 scale */
  estimate?: number;

  /** The title of the issue */
  title?: string;

  /**  Array of IDs of labels to be assigned to the issue*/
  labelIds?: string[];

  /** The ID of the project the issue belongs to */
  projectId?: string;

  /** A detailed description of the issue */
  description?: string;
};

export default withAccessToken(linear)(async (inputs: Input) => {
  const { issueId, ...update } = inputs;
  const result = await updateIssue(issueId, update);

  if (!result.success) {
    throw new Error("Failed to update issue");
  }

  return result;
});

export const confirmation = withAccessToken(linear)(async (inputs: Input) => {
  const { issueId, ...fieldsToUpdate } = inputs;
  const { linearClient } = getLinearClient();

  const issue = await linearClient.issue(issueId);

  const details = await Promise.all(
    Object.keys(fieldsToUpdate).map((key) => {
      const name = key as keyof typeof fieldsToUpdate;
      return formatConfirmation({ name, value: fieldsToUpdate[name] });
    }),
  );

  return {
    message: `Are you sure you want to update the [issue](${issue.url})?`,
    info: [formatConfirmation({ name: "issueId", value: issueId }), ...details],
  };
});
