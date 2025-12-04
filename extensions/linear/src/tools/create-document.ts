import { withAccessToken } from "@raycast/utils";

import { getLinearClient, linear } from "../api/linearClient";

type Input = {
  /** The content of the document/PRD as a Markdown string */
  content: string;

  /** The title of the document/PRD */
  title: string;

  /** The ID of the project the document/PRD belongs to */
  projectId: string;
};

export default withAccessToken(linear)(async (inputs: Input) => {
  const { linearClient } = getLinearClient();
  const result = await linearClient.createDocument(inputs);

  if (!result.success) {
    throw new Error("Failed to create document");
  }

  return result.document;
});

export const confirmation = withAccessToken(linear)(async ({ title, projectId }: Input) => {
  const { linearClient } = getLinearClient();

  const project = await linearClient.project(projectId);

  return {
    info: [
      { name: "Title", value: title },
      { name: "Project", value: project.name },
    ],
  };
});
