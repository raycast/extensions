import { withAccessToken } from "@raycast/utils";

import { getLinearClient, linear } from "../api/linearClient";

type Input = {
  /** The ID of the project update to modify. */
  milestoneId: string;

  /** The new name of the milestone */
  name?: string;

  /** A new detailed description of the milestone */
  description?: string;

  /** The new target date of the milestone in ISO date format (e.g., '2023-12-31') */
  targetDate?: string;
};

export default withAccessToken(linear)(async ({ milestoneId, ...inputs }: Input) => {
  const { linearClient } = getLinearClient();
  const result = await linearClient.updateProjectMilestone(milestoneId, inputs);

  if (!result.success) {
    throw new Error("Failed to update project milestone");
  }

  return JSON.stringify(result.projectMilestone);
});

export const confirmation = withAccessToken(linear)(async ({ milestoneId }: Input) => {
  const { linearClient } = getLinearClient();

  const milestone = await linearClient.projectMilestone(milestoneId);

  return {
    info: [{ name: "Name", value: milestone.name }],
  };
});
