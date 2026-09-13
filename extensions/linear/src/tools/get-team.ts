import { resolveTeam } from "./linearUtils";
import { withToolAuth } from "./resolveToolWorkspace";
type Input = {
  /** Team UUID, key, or name */ query: string;
  /** The workspace to act in: a workspaceId value returned by the get-workspaces tool. Omit to use the active workspace. */
  workspaceId?: string;
};
export default withToolAuth(async ({ query }: Input) => resolveTeam(query));
