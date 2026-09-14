import path from "path";

import { appendFileAttachments } from "../api/attachments";
import { resolveClient } from "../api/linearClient";

import { serializeComment } from "./commentUtils";
import { describeToolWorkspace, resolveToolClient, withToolAuth } from "./resolveToolWorkspace";

type Input = {
  /** The ID of the issue to associate the comment with. Format is a combination of a team key and a unique number, like `ENG-123` */
  issueId?: string;

  /** The ID of the parent comment (for nested comments) */
  parentId?: string;

  /** The ID of the project update to associate the comment with */
  projectUpdateId?: string;

  /** The comment content in markdown format */
  body: string;

  /** A list of absolute local file paths to upload and append to the comment */
  attachmentPaths?: string[];

  /** The workspace to act in: a workspaceId value returned by the get-workspaces tool. Omit to use the active workspace. */
  workspaceId?: string;
};

export default withToolAuth(async (inputs: Input) => {
  const client = await resolveToolClient(inputs.workspaceId);
  const { linearClient } = resolveClient(client);
  const body = await appendFileAttachments(inputs.body, inputs.attachmentPaths, client);
  const result = await linearClient.createComment({
    issueId: inputs.issueId,
    parentId: inputs.parentId,
    projectUpdateId: inputs.projectUpdateId,
    body,
  });

  if (!result.success || !result.comment) {
    throw new Error("Failed to create comment");
  }

  return serializeComment(await result.comment);
});

export const confirmation = withToolAuth(
  async ({ issueId, parentId, projectUpdateId, body, attachmentPaths, workspaceId }: Input) => {
    const workspaceName = await describeToolWorkspace(workspaceId);
    const client = await resolveToolClient(workspaceId);
    const { linearClient } = resolveClient(client);

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
        ...(workspaceName ? [{ name: "Workspace", value: workspaceName }] : []),
        { name: "Title", value: title },
        { name: "Comment", value: body },
        ...(attachmentPaths?.length
          ? [{ name: "Attachments", value: attachmentPaths.map((filePath) => path.basename(filePath)).join(", ") }]
          : []),
      ],
    };
  },
);
