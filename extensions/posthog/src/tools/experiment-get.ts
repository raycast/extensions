import { getExperiment } from "../api/experiments";
import { getActiveProjectId, projectUrl } from "./_shared";

type Input = {
  /** The numeric experiment ID. Get this from `experiment-get-all`. */
  experimentId: number;
};

export default async function (input: Input) {
  const projectId = await getActiveProjectId();
  const experiment = await getExperiment(projectId, input.experimentId);
  return { ...experiment, url: projectUrl(`experiments/${experiment.id}`) };
}
