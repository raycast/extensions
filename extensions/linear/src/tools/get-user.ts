import { resolveUser } from "./linearUtils";
import { withToolAuth } from "./resolveToolWorkspace";
type Input = {
  /** User ID, name, email, or "me" */ query: string;
  /** The workspace to act in: a workspaceId value returned by the get-workspaces tool. Omit to use the active workspace. */
  workspaceId?: string;
};
export default withToolAuth(async ({ query }: Input) => resolveUser(query));
