import { withAccessToken } from "@raycast/utils";

import { uploadFile } from "../api/attachments";
import { linear } from "../api/linearClient";

import { client, resolveIssue } from "./linearUtils";

type Input = {
  issue: string;
  /** Absolute path to the local file to upload */
  filePath: string;
  title?: string;
  subtitle?: string;
};

export default withAccessToken(linear)(async (input: Input) => {
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
