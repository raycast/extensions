import path from "path";

import { appendFileAttachments } from "../api/attachments";
import { resolveClient } from "../api/linearClient";

import { serializeComment } from "./commentUtils";
import { describeToolWorkspace, resolveToolClient, withToolAuth } from "./resolveToolWorkspace";

type Input = {
  /** The comment content in markdown format */
  body: string;

  /** A list of absolute local file paths to upload and append to the comment */
  attachmentPaths?: string[];

  /** The ID of the comment to update */
  id: string;

  /** The workspace to act in: a workspaceId value returned by the get-workspaces tool. Omit to use the active workspace. */
  workspaceId?: string;
};

export default withToolAuth(async (inputs: Input) => {
  const client = await resolveToolClient(inputs.workspaceId);
  const { linearClient } = resolveClient(client);
  const body = await appendFileAttachments(inputs.body, inputs.attachmentPaths, client);
  const result = await linearClient.updateComment(inputs.id, { body });

  if (!result.success || !result.comment) {
    throw new Error("Failed to update comment");
  }
  return serializeComment(await result.comment);
});

export const confirmation = withToolAuth(async ({ id, body, attachmentPaths, workspaceId }: Input) => {
  const workspaceName = await describeToolWorkspace(workspaceId);
  const client = await resolveToolClient(workspaceId);
  const { linearClient } = resolveClient(client);

  const comment = await linearClient.comment({ id });

  return {
    message: `Are you sure you want to update the [comment](${comment.url})?`,
    info: [
      ...(workspaceName ? [{ name: "Workspace", value: workspaceName }] : []),
      { name: "Comment", value: body },
      ...(attachmentPaths?.length
        ? [{ name: "Attachments", value: attachmentPaths.map((filePath) => path.basename(filePath)).join(", ") }]
        : []),
    ],
  };
});
