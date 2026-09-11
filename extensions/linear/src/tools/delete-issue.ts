import { withAccessToken } from "@raycast/utils";

import { linear } from "../api/linearClient";

import { client, resolveIssue } from "./linearUtils";

type Input = {
  /** Issue ID or identifier (e.g. LIN-123). */
  id: string;
};

export default withAccessToken(linear)(async ({ id }: Input) => {
  const issue = await resolveIssue(id);
  const result = await client().deleteIssue(issue.id);

  if (!result.success) throw new Error(`Failed to delete ${issue.identifier}.`);

  return {
    success: true,
    id: issue.id,
    identifier: issue.identifier,
    title: issue.title,
    url: issue.url,
  };
});

export const confirmation = withAccessToken(linear)(async ({ id }: Input) => {
  const issue = await resolveIssue(id);

  return {
    message: `Delete [${issue.identifier}: ${issue.title}](${issue.url})? The issue can be restored from Linear's Recently deleted issues for 30 days.`,
    info: [{ name: "Issue", value: issue.identifier }],
  };
});
