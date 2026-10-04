import { client, resolveInitiativeLabel } from "./linearUtils";
import { serializeLabel } from "./serializers";
import { withLinear } from "./withLinear";

type Input = { name: string; description?: string; color?: string; parent?: string; isGroup?: boolean };
export default withLinear(async (input: Input) => {
  const parentId = input.parent ? (await resolveInitiativeLabel(input.parent)).id : undefined;
  const result = await client().createInitiativeLabel({
    name: input.name,
    description: input.description,
    color: input.color,
    parentId,
    isGroup: input.isGroup ?? false,
  });
  if (!result.success) throw new Error("Failed to create initiative label.");
  const label = await result.initiativeLabel;
  if (!label) throw new Error("Failed to create initiative label.");
  return serializeLabel(label);
});
