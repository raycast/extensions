import { client } from "./linearUtils";
import { withToolAuth } from "./resolveToolWorkspace";

type Input = {
  /** Agent skill ID */ id: string;
  /** The workspace to act in: a workspaceId value returned by the get-workspaces tool. Omit to use the active workspace. */
  workspaceId?: string;
};
export default withToolAuth(async ({ id }: Input) => client().agentSkill(id));
