import { resolveMilestone } from "./linearUtils";
import { serializeMilestone } from "./serializers";
import { withLinear } from "./withLinear";
type Input = { project: string; query: string };
export default withLinear(async ({ project, query }: Input) =>
  serializeMilestone(await resolveMilestone(project, query)),
);
