import { client, collect, CursorPageInput, resolveProject } from "./linearUtils";
import { mapPage, serializeMilestone } from "./serializers";
import { withLinear } from "./withLinear";

interface Input extends CursorPageInput {
  /** Max results (default 50, max 250) */ limit?: number;
  /** Next page cursor */ cursor?: string;
  /** Project name, ID, or slug. Omit to list milestones of all projects; each milestone carries its `projectId`. */
  project?: string;
}

/** Lists project milestones for one project, or across the workspace when no project is given. */
export default withLinear(async (input: Input) => {
  const project = input.project ? await resolveProject(input.project) : undefined;
  const page = await collect(
    ({ first, after }) =>
      project ? project.projectMilestones({ first, after }) : client().projectMilestones({ first, after }),
    input,
  );
  return mapPage(page, serializeMilestone);
});
