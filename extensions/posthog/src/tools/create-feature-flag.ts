import { Tool } from "@raycast/api";

import { createFeatureFlag } from "../api/flags";
import { getActiveProjectId, projectUrl } from "./_shared";

type Input = {
  /**
   * Unique flag key (lowercase, hyphens). Used in code: `posthog.isFeatureEnabled("flag-key")`.
   * Example: "new-checkout-flow".
   */
  key: string;
  /** Human-readable name shown in the PostHog UI. */
  name: string;
  /** Whether the flag starts active. Defaults to true. */
  active?: boolean;
  /**
   * Optional rollout percentage from 0 to 100 to apply to all users.
   * If omitted, the flag is created without rollout — it will be off until configured.
   */
  rollout_percentage?: number;
};

export default async function (input: Input) {
  const projectId = await getActiveProjectId();
  const body = {
    key: input.key,
    name: input.name,
    active: input.active ?? true,
    filters:
      input.rollout_percentage != null
        ? { groups: [{ properties: [], rollout_percentage: input.rollout_percentage }] }
        : { groups: [{ properties: [], rollout_percentage: 0 }] },
  };
  const flag = await createFeatureFlag(projectId, body);
  return { ...flag, url: projectUrl(`feature_flags/${flag.id}`) };
}

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: `Create feature flag "${input.key}"?`,
  info: [
    { name: "Key", value: input.key },
    { name: "Name", value: input.name },
    { name: "Active", value: String(input.active ?? true) },
    { name: "Rollout", value: input.rollout_percentage != null ? `${input.rollout_percentage}%` : "off" },
  ],
});
