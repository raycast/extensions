import { Tool } from "@raycast/api";

import { createExperiment } from "../api/experiments";
import { getActiveProjectId, projectUrl } from "./_shared";

type Input = {
  /** Experiment name. */
  name: string;
  /** Description / hypothesis. */
  description?: string;
  /**
   * Key for the feature flag that will gate the experiment. Use lowercase, hyphens.
   * Example: "checkout-button-v2".
   */
  feature_flag_key: string;
  /** ISO 8601 datetime to start the experiment. Omit to leave as draft. */
  start_date?: string;
  /**
   * Experiment parameters encoded as a JSON string. Typically
   * `{"feature_flag_variants":[{"key":"control","rollout_percentage":50},{"key":"test","rollout_percentage":50}]}`.
   */
  parametersJson?: string;
};

export default async function (input: Input) {
  const projectId = await getActiveProjectId();
  const experiment = await createExperiment(projectId, {
    name: input.name,
    description: input.description ?? "",
    feature_flag_key: input.feature_flag_key,
    start_date: input.start_date ?? null,
    parameters: input.parametersJson ? JSON.parse(input.parametersJson) : {},
  });
  return { ...experiment, url: projectUrl(`experiments/${experiment.id}`) };
}

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: `Create experiment "${input.name}"?`,
  info: [
    { name: "Name", value: input.name },
    { name: "Feature flag key", value: input.feature_flag_key },
    { name: "Start", value: input.start_date ?? "draft" },
  ],
});
