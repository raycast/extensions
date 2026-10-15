import { getMembers, resolveProject } from "../api/ai";
import { withPlane } from "../helpers/with-plane";

type Input = {
  /** Optional project identifier (e.g. ENG). Without it, lists workspace members. */
  project?: string;
};

export default withPlane(async (input: Input) => {
  const project = input.project ? await resolveProject(input.project) : undefined;
  return getMembers(project?.id);
});
