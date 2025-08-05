import { withAccessToken } from "@raycast/utils";

import { getLinearClient, linear } from "../api/linearClient";

type Input = {
  /** The ID of the issue to associate the comment with. Format is a combination of a team key and a unique number, like `ENG-123` */
  issueId?: string;

  /** The ID of the parent comment (for nested comments) */
  parentId?: string;

  /** The ID of the project update to associate the comment with */
  projectUpdateId?: string;

  /** The comment content in markdown format */
  body: string;
};

export default withAccessToken(linear)(async (inputs: Input) => {
  const { linearClient } = getLinearClient();
  const result = await linearClient.createComment(inputs);

  if (!result.success) {
    throw new Error("Failed to create comment");
  }

  return result.comment;
});

export const confirmation = withAccessToken(linear)(async ({ issueId, parentId, projectUpdateId, body }: Input) => {
  const { linearClient } = getLinearClient();

  let title: string = "";

  if (issueId) {
    const issue = await linearClient.issue(issueId);
    title = issue.title;
  } else if (parentId) {
    const parentComment = await linearClient.comment({ id: parentId });
    title = parentComment.body;
  } else if (projectUpdateId) {
    title = "Project Update";
  }

  return {
    info: [
      { name: "Title", value: title },
      { name: "Comment", value: body },
    ],
  };
});
