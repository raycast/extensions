import path from "path";

import { withAccessToken } from "@raycast/utils";

import { appendFileAttachments } from "../api/attachments";
import { getLinearClient, linear } from "../api/linearClient";

type Input = {
  /** The comment content in markdown format */
  body: string;

  /** A list of absolute local file paths to upload and append to the comment */
  attachmentPaths?: string[];

  /** The ID of the comment to update */
  id: string;
};

export default withAccessToken(linear)(async (inputs: Input) => {
  const { linearClient } = getLinearClient();
  const body = await appendFileAttachments(inputs.body, inputs.attachmentPaths);
  const result = await linearClient.updateComment(inputs.id, { body });

  if (!result.success) {
    throw new Error("Failed to update comment");
  }
  return result.comment;
});

export const confirmation = withAccessToken(linear)(async ({ id, body, attachmentPaths }: Input) => {
  const { linearClient } = getLinearClient();

  const comment = await linearClient.comment({ id });

  return {
    message: `Are you sure you want to update the [comment](${comment.url})?`,
    info: [
      { name: "Comment", value: body },
      ...(attachmentPaths?.length
        ? [{ name: "Attachments", value: attachmentPaths.map((filePath) => path.basename(filePath)).join(", ") }]
        : []),
    ],
  };
});
