import { resolveClient } from "../api/linearClient";

import { describeToolWorkspace, resolveToolClient, withToolAuth } from "./resolveToolWorkspace";

type Input = {
  /** The ID of the project to create an update for. Use the 'get-projects' tool to get the project ID. */
  projectId: string;

  /** The content of the project update in markdown format */
  body: string;

  /** The health status of the project */
  health: "onTrack" | "atRisk" | "offTrack";

  /** The workspace to act in: a workspaceId value returned by the get-workspaces tool. Omit to use the active workspace. */
  workspaceId?: string;
};

export default withToolAuth(async ({ workspaceId, ...inputs }: Input) => {
  const client = await resolveToolClient(workspaceId);
  const { linearClient } = resolveClient(client);
  // @ts-expect-error the enum is correct
  const result = await linearClient.createProjectUpdate(inputs);

  if (!result.success) {
    throw new Error("Failed to create project update");
  }

  return result.projectUpdate;
});

export const confirmation = withToolAuth(async ({ projectId, workspaceId }: Input) => {
  const workspaceName = await describeToolWorkspace(workspaceId);
  const client = await resolveToolClient(workspaceId);
  const { linearClient } = resolveClient(client);

  const project = await linearClient.project(projectId);

  return {
    info: [
      ...(workspaceName ? [{ name: "Workspace", value: workspaceName }] : []),
      { name: "Project", value: project.name },
    ],
  };
});
