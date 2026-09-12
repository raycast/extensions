import { withAccessToken } from "@raycast/utils";

import { getLinearClient, linear } from "../api/linearClient";

type Input = {
  /** The ID of the document/PRD to update */
  documentId: string;

  /** The content of the document/PRD as a Markdown string */
  content?: string;

  /** The title of the document/PRD */
  title?: string;

  /** The ID of the project the document/PRD belongs to */
  projectId?: string;
};

export default withAccessToken(linear)(async (inputs: Input) => {
  const { linearClient } = getLinearClient();
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

export const confirmation = withAccessToken(linear)(async ({ documentId }: Input) => {
  const { linearClient } = getLinearClient();

  const document = await linearClient.document(documentId);

  return {
    message: `Are you sure you want to update the [document](${document.url})?`,
    info: [{ name: "Title", value: document.title }],
  };
});
