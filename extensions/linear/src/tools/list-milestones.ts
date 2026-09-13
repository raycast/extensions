import { collect, CursorPageInput, resolveProject } from "./linearUtils";
import { withToolAuth } from "./resolveToolWorkspace";

interface Input extends CursorPageInput {
  /** Max results (default 50, max 250) */ limit?: number;
  /** Next page cursor */ cursor?: string;
  project: string;
  /** The workspace to act in: a workspaceId value returned by the get-workspaces tool. Omit to use the active workspace. */
  workspaceId?: string;
}

export default withToolAuth(async (input: Input) => {
  const project = await resolveProject(input.project);
  return collect(({ first, after }) => project.projectMilestones({ first, after }), input);
});
