import { withAccessToken } from "@raycast/utils";

import { getLinearClient, linear } from "../api/linearClient";

type Input = {
  /** The ID of the project to create an update for. Use the 'get-projects' tool to get the project ID. */
  projectId: string;

  /** The content of the project update in markdown format */
  body: string;

  /** The health status of the project */
  health: "onTrack" | "atRisk" | "offTrack";
};

export default withAccessToken(linear)(async (inputs: Input) => {
  const { linearClient } = getLinearClient();
  // @ts-expect-error the enum is correct
  const result = await linearClient.createProjectUpdate(inputs);

  if (!result.success) {
    throw new Error("Failed to create project update");
  }

  return result.projectUpdate;
});

export const confirmation = withAccessToken(linear)(async ({ projectId }: Input) => {
  const { linearClient } = getLinearClient();

  const project = await linearClient.project(projectId);

  return {
    info: [{ name: "Project", value: project.name }],
  };
});
