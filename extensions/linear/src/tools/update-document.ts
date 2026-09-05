import { resolveClient } from "../api/linearClient";

import { describeToolWorkspace, resolveToolClient, withToolAuth } from "./resolveToolWorkspace";

type Input = {
  /** The ID of the document/PRD to update */
  documentId: string;

  /** The content of the document/PRD as a Markdown string */
  content?: string;

  /** The title of the document/PRD */
  title?: string;

  /** The ID of the project the document/PRD belongs to */
  projectId?: string;

  /** The workspace to act in: a workspaceId value returned by the get-workspaces tool. Omit to use the active workspace. */
  workspaceId?: string;
};

export default withToolAuth(async (inputs: Input) => {
  const client = await resolveToolClient(inputs.workspaceId);
  const { linearClient } = resolveClient(client);
  const result = await linearClient.updateDocument(inputs.documentId, {
    content: inputs.content,
    projectId: inputs.projectId,
    title: inputs.title,
  });

  if (!result.success) {
    throw new Error("Failed to update document");
  }

  return result.document;
});

export const confirmation = withToolAuth(async ({ documentId, workspaceId }: Input) => {
  const workspaceName = await describeToolWorkspace(workspaceId);
  const client = await resolveToolClient(workspaceId);
  const { linearClient } = resolveClient(client);

  const document = await linearClient.document(documentId);

  return {
    message: `Are you sure you want to update the [document](${document.url})?`,
    info: [
      ...(workspaceName ? [{ name: "Workspace", value: workspaceName }] : []),
      { name: "Title", value: document.title },
    ],
  };
});
