import { resolveClient } from "../api/linearClient";

import { describeToolWorkspace, resolveToolClient, withToolAuth } from "./resolveToolWorkspace";

type Input = {
  /** The content of the document/PRD as a Markdown string */
  content: string;

  /** The title of the document/PRD */
  title: string;

  /** The ID of the project the document/PRD belongs to */
  projectId: string;

  /** The workspace to act in: a workspaceId value returned by the get-workspaces tool. Omit to use the active workspace. */
  workspaceId?: string;
};

export default withToolAuth(async ({ workspaceId, ...inputs }: Input) => {
  const client = await resolveToolClient(workspaceId);
  const { linearClient } = resolveClient(client);
  const result = await linearClient.createDocument(inputs);

  if (!result.success) {
    throw new Error("Failed to create document");
  }

  return result.document;
});

export const confirmation = withToolAuth(async ({ title, projectId, workspaceId }: Input) => {
  const workspaceName = await describeToolWorkspace(workspaceId);
  const client = await resolveToolClient(workspaceId);
  const { linearClient } = resolveClient(client);

  const project = await linearClient.project(projectId);

  return {
    info: [
      ...(workspaceName ? [{ name: "Workspace", value: workspaceName }] : []),
      { name: "Title", value: title },
      { name: "Project", value: project.name },
    ],
  };
});
