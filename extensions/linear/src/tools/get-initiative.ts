import { resolveInitiative } from "./linearUtils";
import { defaultInitiativeFields, InitiativeField, serializeInitiative } from "./serializers";
import { withLinear } from "./withLinear";

type Input = { query: string; includeProjects?: boolean; includeSubInitiatives?: boolean };

export default withLinear(async (input: Input) => {
  const initiative = await resolveInitiative(input.query);
  const fields: InitiativeField[] = [
    ...defaultInitiativeFields,
    ...(input.includeProjects ? (["projects"] as const) : []),
    ...(input.includeSubInitiatives ? (["subInitiatives"] as const) : []),
  ];
  return serializeInitiative(initiative, fields);
});
