import { getExperiment, getExperimentResults } from "../api/experiments";
import { PostHogAPIError } from "../api/client";
import { getActiveProjectId, projectUrl } from "./_shared";

type Input = {
  /** The numeric experiment ID. Get this from `experiment-get-all`. */
  experimentId: number;
};

export default async function (input: Input) {
  const projectId = await getActiveProjectId();
  // Try the legacy REST endpoint first.
  try {
    const results = await getExperimentResults(projectId, input.experimentId);
    return { ...results, url: projectUrl(`experiments/${input.experimentId}`) };
  } catch (e) {
    if (!(e instanceof PostHogAPIError) || e.status !== 404) throw e;
  }
  // Fall back to returning the experiment definition + a hint for the AI.
  // PostHog's full results pipeline requires multiple sub-queries that vary per metric type;
  // the AI can compose them via `query-run` once it has the experiment's exposure cohort and metric definitions.
  const experiment = await getExperiment(projectId, input.experimentId);
  return {
    experiment,
    url: projectUrl(`experiments/${input.experimentId}`),
    note:
      "The REST results endpoint isn't available for this experiment. " +
      "Use the experiment's `feature_flag_key`, `parameters`, and `filters` to build TrendsQueries via `query-run` " +
      "for each variant, or open the experiment in PostHog to view results.",
  };
}
