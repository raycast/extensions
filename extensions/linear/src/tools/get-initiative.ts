import { withAccessToken } from "@raycast/utils";

import { linear } from "../api/linearClient";

import { defaultInitiativeFields, InitiativeField, serializeInitiative } from "./initiativeUtils";
import { resolveInitiative } from "./linearUtils";

type Input = { query: string; includeProjects?: boolean; includeSubInitiatives?: boolean };

export default withAccessToken(linear)(async (input: Input) => {
  const initiative = await resolveInitiative(input.query);
  const fields: InitiativeField[] = [
    ...defaultInitiativeFields,
    ...(input.includeProjects ? (["projects"] as const) : []),
    ...(input.includeSubInitiatives ? (["subInitiatives"] as const) : []),
  ];
  return serializeInitiative(initiative, fields);
});
