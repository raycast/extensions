import { resolveClient } from "../api/linearClient";

import { describeToolWorkspace, resolveToolClient, withToolAuth } from "./resolveToolWorkspace";

type Input = {
  /** The ID of the project update to modify. */
  milestoneId: string;

  /** The new name of the milestone */
  name?: string;

  /** A new detailed description of the milestone */
  description?: string;

  /** The new target date of the milestone in ISO date format (e.g., '2023-12-31') */
  targetDate?: string;

  /** The workspace to act in: a workspaceId value returned by the get-workspaces tool. Omit to use the active workspace. */
  workspaceId?: string;
};

export default withToolAuth(async ({ milestoneId, workspaceId, ...inputs }: Input) => {
  const client = await resolveToolClient(workspaceId);
  const { linearClient } = resolveClient(client);
  const result = await linearClient.updateProjectMilestone(milestoneId, inputs);

  if (!result.success) {
    throw new Error("Failed to update project milestone");
  }

  return JSON.stringify(result.projectMilestone);
});

export const confirmation = withToolAuth(async ({ milestoneId, workspaceId }: Input) => {
  const workspaceName = await describeToolWorkspace(workspaceId);
  const client = await resolveToolClient(workspaceId);
  const { linearClient } = resolveClient(client);

  const milestone = await linearClient.projectMilestone(milestoneId);

  return {
    info: [
      ...(workspaceName ? [{ name: "Workspace", value: workspaceName }] : []),
      { name: "Name", value: milestone.name },
    ],
  };
});
