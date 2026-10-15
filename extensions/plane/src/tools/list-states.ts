import { getProjectStates, resolveProject } from "../api/ai";
import { withPlane } from "../helpers/with-plane";

type Input = {
  /** Project identifier (e.g. ENG), name, or id. States are project-specific. */
  project: string;
};

export default withPlane(async (input: Input) => {
  const project = await resolveProject(input.project);
  const states = await getProjectStates(project.id);
  return states.map((state) => ({
    id: state.id,
    name: state.name,
    group: state.group,
    isDefault: state._default ?? false,
  }));
});
