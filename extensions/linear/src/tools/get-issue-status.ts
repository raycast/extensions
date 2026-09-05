import { resolveWorkflowState } from "./issueUtils";
import { withToolAuth } from "./resolveToolWorkspace";

type Input = {
  id: string;
  name: string;
  team: string;
  /** The workspace to act in: a workspaceId value returned by the get-workspaces tool. Omit to use the active workspace. */
  workspaceId?: string;
};

export default withToolAuth(async (input: Input) => {
  const status = await resolveWorkflowState(input.id, input.team);
  if (status.name.toLowerCase() !== input.name.toLowerCase()) {
    throw new Error(`Status ${input.id} is named "${status.name}", not "${input.name}".`);
  }
  return status;
});
