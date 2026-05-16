import { Action, Tool } from "@raycast/api";

import { deleteExperiment, getExperiment } from "../api/experiments";
import { getActiveProjectId } from "./_shared";

type Input = {
  /** The numeric experiment ID. Get this from `experiment-get-all`. */
  experimentId: number;
};

export default async function (input: Input) {
  const projectId = await getActiveProjectId();
  await deleteExperiment(projectId, input.experimentId);
  return { deleted: input.experimentId };
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const projectId = await getActiveProjectId();
  const current = await getExperiment(projectId, input.experimentId);
  return {
    style: Action.Style.Destructive,
    message: `Delete experiment "${current.name}"?`,
    info: [
      { name: "Experiment", value: current.name },
      { name: "ID", value: String(current.id) },
    ],
  };
};
