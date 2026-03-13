import { withAccessToken } from "@raycast/utils";
import { markdownToAdf } from "marklassian";

import { updateIssue } from "../api/issues";
import { jira } from "../api/jiraCredentials";

/**
 * Docs for the update method: https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/#api-rest-api-3-issue-issueidorkey-put
 */
type Input = {
  /** The ID or key of the issue to update */
  issueIdOrKey: string;

  /** The new title/summary of the issue */
  summary?: string;

  /** The new description of the issue in markdown format */
  description?: string;

  /** The new due date of the issue in ISO date format (e.g., '2023-12-31') */
  dueDate?: string;

  /** Comma-separated list of labels to add to the issue */
  addLabels?: string;

  /** Comma-separated list of labels to remove from the issue */
  removeLabels?: string;

  /** The confirmation object to be displayed to the user */
  confirmation: {
    issueSummary: string;
  };
};

/**
 * Update a Jira issue's fields and properties
 */
export default withAccessToken(jira)(async function (input: Input) {
  const { issueIdOrKey, summary, description, dueDate, addLabels, removeLabels } = input;

  const body: { update: Record<string, unknown[]> } = { update: {} };

  if (summary) {
    body.update.summary = [{ set: summary }];
  }

  if (description) {
    body.update.description = [{ set: markdownToAdf(description) }];
  }

  if (dueDate) {
    body.update.duedate = [{ set: dueDate }];
  }

  if (addLabels || removeLabels) {
    body.update.labels = [];
    if (addLabels) {
      addLabels
        .split(",")
        .map((l) => l.trim())
        .forEach((label) => body.update.labels.push({ add: label }));
    }
    if (removeLabels) {
      removeLabels
        .split(",")
        .map((l) => l.trim())
        .forEach((label) => body.update.labels.push({ remove: label }));
    }
  }

  if (Object.keys(body.update).length === 0) {
    throw new Error("No updates provided");
  }

  return updateIssue(issueIdOrKey, body);
});

export const confirmation = withAccessToken(jira)(async (input: Input) => {
  const info = [
    { name: "Issue", value: input.confirmation.issueSummary },
    { name: "Key", value: input.issueIdOrKey },
  ];

  if (input.summary) {
    info.push({ name: "New Summary", value: input.summary });
  }

  if (input.description) {
    info.push({ name: "New Description", value: input.description });
  }

  if (input.dueDate) {
    info.push({ name: "New Due Date", value: input.dueDate });
  }

  if (input.addLabels) {
    info.push({ name: "Adding Labels", value: input.addLabels });
  }

  if (input.removeLabels) {
    info.push({ name: "Removing Labels", value: input.removeLabels });
  }

  return { info };
});
