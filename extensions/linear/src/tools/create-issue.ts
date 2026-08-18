import { createIssue, CreateIssuePayload } from "../api/createIssue";

import { formatConfirmation } from "./formatConfirmation";
import { describeToolWorkspace, resolveToolClient, withToolAuth } from "./resolveToolWorkspace";

type Input = {
  /** The priority of the issue (0-4, where 0 is no priority and 4 is urgent) */
  priority?: number;

  /**
   * The id of the State (issue or 'workflow' status) of the issue.
   * If an issue is created without a specified stateId (the status field for the issue), the issue will be assigned to the team's first state in the Backlog workflow state category.
   * If the "Triage" feature is turned on for the team, then the issue will be assigned to the Triage workflow state.
   */
  stateId?: string;

  /** The ID of the parent issue. Use it to add sub-issues. UUID format */
  parentId?: string;

  /** The ID of the user to assign the issue to */
  assigneeId?: string;

  /** The title of the issue */
  title: string;

  /** The ID of the team to fetch the statuses for. Do not ask user to specify team if there is only one in the list */
  teamId: string;

  /**  Array of IDs of labels to be assigned to new issue*/
  labelIds?: string[];

  /** The ID of the project the issue belongs to */
  projectId?: string;

  /** A detailed description of the issue */
  description?: string;

  /** The ID of the project milestone the issue belongs to */
  projectMilestoneId?: string;

  /** The due date of the issue in ISO date format (e.g., '2023-12-31') */
  dueDate?: string;

  /** The estimate of the issue using a 0-5 scale */
  estimate?: number;

  /** The workspace to act in: a workspaceId value returned by the get-workspaces tool. Omit to use the active workspace. */
  workspaceId?: string;
};

export default withToolAuth(async (inputs: Input) => {
  const client = await resolveToolClient(inputs.workspaceId);
  const payload: CreateIssuePayload = {
    teamId: inputs.teamId,
    title: inputs.title,
    description: inputs.description || "",
    stateId: inputs.stateId,
    labelIds: inputs.labelIds || [],
    dueDate: inputs.dueDate ? new Date(inputs.dueDate) : null,
    ...(inputs.assigneeId ? { assigneeId: inputs.assigneeId } : {}),
    ...(inputs.projectId ? { projectId: inputs.projectId } : {}),
    ...(inputs.parentId ? { parentId: inputs.parentId } : {}),
    priority: inputs.priority || 0,
  };

  return createIssue(payload, client);
});

export const confirmation = withToolAuth(async (inputs: Input) => {
  const workspaceName = await describeToolWorkspace(inputs.workspaceId);
  const client = await resolveToolClient(inputs.workspaceId);
  const { title, workspaceId, ...fields } = inputs;
  void workspaceId; // destructured only to exclude it from `fields`
  const details = await Promise.all(
    Object.keys(fields).map((key) => {
      const name = key as keyof typeof fields;
      return formatConfirmation({ name, value: fields[name], client });
    }),
  );

  return {
    info: [
      ...(workspaceName ? [{ name: "Workspace", value: workspaceName }] : []),
      formatConfirmation({ name: "Title", value: title, client }),
      ...details,
    ],
  };
});
