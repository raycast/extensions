import { Action, Tool } from "@raycast/api";

import { deleteFeatureFlag, getFeatureFlag, getFeatureFlagByKey } from "../api/flags";
import { getActiveProjectId } from "./_shared";

type Input = {
  /** The flag's `key`. Either this or `flagId` is required. */
  flagKey?: string;
  /** The numeric flag ID. Either this or `flagKey` is required. */
  flagId?: number;
};

async function resolveId(projectId: string, input: Input) {
  if (input.flagId) return input.flagId;
  if (!input.flagKey) throw new Error("Provide flagKey or flagId.");
  const search = await getFeatureFlagByKey(projectId, input.flagKey);
  const match = search.results.find((f) => f.key === input.flagKey);
  if (!match) throw new Error(`No flag with key "${input.flagKey}".`);
  return match.id;
}

export default async function (input: Input) {
  const projectId = await getActiveProjectId();
  const id = await resolveId(projectId, input);
  await deleteFeatureFlag(projectId, id);
  return { deleted: id };
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const projectId = await getActiveProjectId();
  const id = await resolveId(projectId, input);
  const current = await getFeatureFlag(projectId, id);
  return {
    style: Action.Style.Destructive,
    message: `Delete feature flag "${current.key}"?`,
    info: [
      { name: "Key", value: current.key },
      { name: "ID", value: String(current.id) },
    ],
  };
};
