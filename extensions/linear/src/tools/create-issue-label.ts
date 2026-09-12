import { withAccessToken } from "@raycast/utils";

import { linear } from "../api/linearClient";

import { client, resolveIssueLabel } from "./linearUtils";

type Input = {
  name: string;
  description?: string;
  color?: string;
  teamId?: string;
  parent?: string;
  isGroup?: boolean;
};
export default withAccessToken(linear)(async (input: Input) => {
  const parentId = input.parent ? (await resolveIssueLabel(input.parent)).id : undefined;
  const result = await client().createIssueLabel({
    name: input.name,
    description: input.description,
    color: input.color,
    teamId: input.teamId,
    parentId,
    isGroup: input.isGroup ?? false,
  });
  if (!result.success) throw new Error("Failed to create issue label.");
  return result.issueLabel;
});
