import { client, resolveInitiativeLabel } from "./linearUtils";
import { withToolAuth } from "./resolveToolWorkspace";

type Input = {
  name: string;
  description?: string;
  color?: string;
  parent?: string;
  isGroup?: boolean;
  /** The workspace to act in: a workspaceId value returned by the get-workspaces tool. Omit to use the active workspace. */
  workspaceId?: string;
};
export default withToolAuth(async (input: Input) => {
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
