import { Tool } from "@raycast/api";

import { getExperiment, updateExperiment } from "../api/experiments";
import { getActiveProjectId, projectUrl } from "./_shared";

type Input = {
  /** The numeric experiment ID. Get this from `experiment-get-all`. */
  experimentId: number;
  /** New name. */
  name?: string;
  /** New description. */
  description?: string;
  /** Archive (true) or unarchive (false). */
  archived?: boolean;
  /** ISO 8601 datetime to set the end date (completes the experiment). */
  end_date?: string;
  /** ISO 8601 datetime to set or restart the start date. */
  start_date?: string;
};

export default async function (input: Input) {
  const projectId = await getActiveProjectId();
  const { experimentId, ...patch } = input;
  const experiment = await updateExperiment(projectId, experimentId, patch);
  return { ...experiment, url: projectUrl(`experiments/${experiment.id}`) };
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const projectId = await getActiveProjectId();
  const current = await getExperiment(projectId, input.experimentId);
  const info: { name: string; value: string }[] = [{ name: "Experiment", value: `${current.name} (#${current.id})` }];
  if (input.name) info.push({ name: "New name", value: input.name });
  if (input.archived !== undefined) info.push({ name: "Archived", value: String(input.archived) });
  if (input.end_date) info.push({ name: "End date", value: input.end_date });
  if (input.start_date) info.push({ name: "Start date", value: input.start_date });
  return { message: "Update this experiment?", info };
};
