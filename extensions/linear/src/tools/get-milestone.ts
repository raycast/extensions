import { resolveMilestone } from "./linearUtils";
import { withToolAuth } from "./resolveToolWorkspace";
type Input = {
  project: string;
  query: string;
  /** The workspace to act in: a workspaceId value returned by the get-workspaces tool. Omit to use the active workspace. */
  workspaceId?: string;
};
export default withToolAuth(async ({ project, query }: Input) => resolveMilestone(project, query));
