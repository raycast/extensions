import { Action, Tool } from "@raycast/api";

import { deleteInsight, getInsight } from "../api/insights";
import { getActiveProjectId } from "./_shared";

type Input = {
  /** The numeric insight ID. Get this from `insights-get-all`. */
  insightId: number;
};

export default async function (input: Input) {
  const projectId = await getActiveProjectId();
  await deleteInsight(projectId, input.insightId);
  return { deleted: input.insightId };
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const projectId = await getActiveProjectId();
  const current = await getInsight(projectId, input.insightId);
  return {
    style: Action.Style.Destructive,
    message: `Delete insight "${current.name || current.derived_name || current.short_id}"?`,
    info: [
      { name: "Insight", value: current.name || current.derived_name || current.short_id },
      { name: "ID", value: String(current.id) },
    ],
  };
};
