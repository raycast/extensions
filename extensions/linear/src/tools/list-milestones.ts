import { collect, CursorPageInput, resolveProject } from "./linearUtils";
import { mapPage, serializeMilestone } from "./serializers";
import { withLinear } from "./withLinear";

interface Input extends CursorPageInput {
  /** Max results (default 50, max 250) */ limit?: number;
  /** Next page cursor */ cursor?: string;
  project: string;
}

export default withLinear(async (input: Input) => {
  const project = await resolveProject(input.project);
  const page = await collect(({ first, after }) => project.projectMilestones({ first, after }), input);
  return mapPage(page, serializeMilestone);
});
