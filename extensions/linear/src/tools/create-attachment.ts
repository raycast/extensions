import { uploadFile } from "../api/attachments";

import { client, resolveIssue } from "./linearUtils";
import { withToolAuth } from "./resolveToolWorkspace";

type Input = {
  issue: string;
  /** Absolute path to the local file to upload */
  filePath: string;
  title?: string;
  subtitle?: string;
  /** The workspace to act in: a workspaceId value returned by the get-workspaces tool. Omit to use the active workspace. */
  workspaceId?: string;
};

export default withToolAuth(async (input: Input) => {
  const issue = await resolveIssue(input.issue);
  const file = await uploadFile(input.filePath);
  const result = await client().createAttachment({
    issueId: issue.id,
    url: file.assetUrl,
    title: input.title ?? file.name,
    subtitle: input.subtitle,
  });
  if (!result.success || !result.attachment) throw new Error("Failed to create attachment.");
  return result.attachment;
});
