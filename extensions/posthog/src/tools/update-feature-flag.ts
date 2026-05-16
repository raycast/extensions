import { Tool } from "@raycast/api";

import { getFeatureFlag, getFeatureFlagByKey, updateFeatureFlag } from "../api/flags";
import { getActiveProjectId, projectUrl } from "./_shared";

type Input = {
  /** The flag's `key`. Either this or `flagId` is required. */
  flagKey?: string;
  /** The numeric flag ID. Either this or `flagKey` is required. */
  flagId?: number;
  /** Turn the flag on (true) or off (false). */
  active?: boolean;
  /** New name. */
  name?: string;
  /** Rollout percentage from 0 to 100 applied to everyone (resets filter groups). */
  rollout_percentage?: number;
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
  const patch: Record<string, unknown> = {};
  if (input.active !== undefined) patch.active = input.active;
  if (input.name !== undefined) patch.name = input.name;
  if (input.rollout_percentage !== undefined) {
    patch.filters = { groups: [{ properties: [], rollout_percentage: input.rollout_percentage }] };
  }
  const flag = await updateFeatureFlag(projectId, id, patch);
  return { ...flag, url: projectUrl(`feature_flags/${flag.id}`) };
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const projectId = await getActiveProjectId();
  const id = await resolveId(projectId, input);
  const current = await getFeatureFlag(projectId, id);
  const info: { name: string; value: string }[] = [
    { name: "Flag", value: `${current.key} (#${current.id})` },
    { name: "Currently active", value: String(current.active) },
  ];
  if (input.active !== undefined) info.push({ name: "New active", value: String(input.active) });
  if (input.name !== undefined) info.push({ name: "New name", value: input.name });
  if (input.rollout_percentage !== undefined) info.push({ name: "New rollout", value: `${input.rollout_percentage}%` });
  return { message: "Update this feature flag?", info };
};
