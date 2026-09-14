import { defaultInitiativeFields, InitiativeField, serializeInitiative } from "./initiativeUtils";
import { resolveInitiative } from "./linearUtils";
import { withToolAuth } from "./resolveToolWorkspace";

type Input = {
  query: string;
  includeProjects?: boolean;
  includeSubInitiatives?: boolean;
  /** The workspace to act in: a workspaceId value returned by the get-workspaces tool. Omit to use the active workspace. */
  workspaceId?: string;
};

export default withToolAuth(async (input: Input) => {
  const initiative = await resolveInitiative(input.query);
  const fields: InitiativeField[] = [
    ...defaultInitiativeFields,
    ...(input.includeProjects ? (["projects"] as const) : []),
    ...(input.includeSubInitiatives ? (["subInitiatives"] as const) : []),
  ];
  return serializeInitiative(initiative, fields);
});
