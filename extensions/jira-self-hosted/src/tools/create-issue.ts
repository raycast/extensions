import { format } from "date-fns";

import { createIssue } from "../api/issues";
import { getIssueUrl } from "../helpers/urls";
import { withJiraCredentials } from "../helpers/withJiraCredentials";

type Input = {
  /** The ID of the project the issue belongs to */
  projectId: string;

  /** The ID of the issue type (e.g., Story, Bug, Task) */
  issueTypeId: string;

  /** The title/summary of the issue */
  summary: string;

  /** A detailed description of the issue */
  description?: string;

  /** The username (login name) of the user to assign the issue to. Don't set anything if the user didn't specify one. */
  assigneeId?: string;

  /** Array of label strings to be assigned to the issue */
  labels?: string[];

  /** The due date of the issue in ISO date format (e.g., '2023-12-31') */
  dueDate?: string;

  /** The confirmation object to be displayed to the user */
  confirmation: {
    projectName: string;
    issueTypeName: string;
    assigneeName: string;
  };
};

export default withJiraCredentials(async function (input: Input) {
  const payload = {
    parent: "",
    priorityId: "",
    attachments: [] as string[],
    description: "",
    ...input,
    assigneeId: input.assigneeId ?? "",
    dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
  };
  const issue = await createIssue(payload, {});

  if (!issue) {
    return "The issue was properly created, but couldn't be found.";
  }

  return { ...issue, url: getIssueUrl(issue.key) };
});

export const confirmation = withJiraCredentials(async (input: Input) => {
  const info = [
    { name: "Project", value: input.confirmation.projectName },
    { name: "Issue Type", value: input.confirmation.issueTypeName },
    { name: "Summary", value: input.summary },
  ];

  if (input.description) {
    info.push({ name: "Description", value: input.description });
  }

  if (input.assigneeId) {
    info.push({ name: "Assignee", value: input.confirmation.assigneeName });
  }

  if (input.labels?.length) {
    info.push({ name: "Labels", value: input.labels.join(", ") });
  }

  if (input.dueDate) {
    info.push({ name: "Due Date", value: format(new Date(input.dueDate), "MMMM d, yyyy") });
  }

  return { info };
});
