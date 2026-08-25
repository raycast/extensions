import { withAccessToken } from "@raycast/utils";

import { linear } from "../api/linearClient";

import { client, resolveIssue } from "./linearUtils";

type Input = { issue: string; assetUrl: string; title?: string; subtitle?: string };
export default withAccessToken(linear)(async (input: Input) => {
  const issue = await resolveIssue(input.issue);
  const filename = decodeURIComponent(new URL(input.assetUrl).pathname.split("/").pop() ?? "attachment");
  const result = await client().createAttachment({
    issueId: issue.id,
    url: input.assetUrl,
    title: input.title ?? filename,
    subtitle: input.subtitle,
  });
  if (!result.success || !result.attachment) throw new Error("Failed to create attachment.");
  return result.attachment;
});
