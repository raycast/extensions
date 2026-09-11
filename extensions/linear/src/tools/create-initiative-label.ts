import { withAccessToken } from "@raycast/utils";

import { linear } from "../api/linearClient";

import { client, resolveInitiativeLabel } from "./linearUtils";

type Input = { name: string; description?: string; color?: string; parent?: string; isGroup?: boolean };
export default withAccessToken(linear)(async (input: Input) => {
  const parentId = input.parent ? (await resolveInitiativeLabel(input.parent)).id : undefined;
  const result = await client().createInitiativeLabel({
    name: input.name,
    description: input.description,
    color: input.color,
    parentId,
    isGroup: input.isGroup ?? false,
  });
  if (!result.success) throw new Error("Failed to create initiative label.");
  return result.initiativeLabel;
});
