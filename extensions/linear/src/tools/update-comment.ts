import { withAccessToken } from "@raycast/utils";

import { getLinearClient, linear } from "../api/linearClient";

type Input = {
  /** The comment content in markdown format */
  body: string;

  /** The ID of the comment to update */
  id: string;
};

export default withAccessToken(linear)(async (inputs: Input) => {
  const { linearClient } = getLinearClient();
  const result = await linearClient.updateComment(inputs.id, { body: inputs.body });

  if (!result.success) {
    throw new Error("Failed to update comment");
  }
  return result.comment;
});

export const confirmation = withAccessToken(linear)(async ({ id, body }: Input) => {
  const { linearClient } = getLinearClient();

  const comment = await linearClient.comment({ id });

  return {
    message: `Are you sure you want to update the [comment](${comment.url})?`,
    info: [{ name: "Comment", value: body }],
  };
});
