import { Tool } from "@raycast/api";

import { getInsight, updateInsight } from "../api/insights";
import { getActiveProjectId, parseJsonInput, projectUrl } from "./_shared";

type Input = {
  /** The numeric insight ID. Get this from `insights-get-all`. */
  insightId: number;
  /** New name. */
  name?: string;
  /** New description. */
  description?: string;
  /** Favorite (true) or unfavorite (false). */
  favorited?: boolean;
  /** Replace the underlying query. PostHog query node encoded as a JSON string, e.g. `{"kind":"TrendsQuery",...}`. */
  queryJson?: string;
};

export default async function (input: Input) {
  const projectId = await getActiveProjectId();
  const { insightId, queryJson, ...patch } = input;
  const body: Record<string, unknown> = { ...patch };
  if (queryJson) body.query = parseJsonInput<Record<string, unknown>>(queryJson, "queryJson");
  const insight = await updateInsight(projectId, insightId, body);
  return { ...insight, url: projectUrl(`insights/${insight.short_id}`) };
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const projectId = await getActiveProjectId();
  const current = await getInsight(projectId, input.insightId);
  const info: { name: string; value: string }[] = [
    { name: "Insight", value: `${current.name || current.derived_name || current.short_id} (#${current.id})` },
  ];
  if (input.name) info.push({ name: "New name", value: input.name });
  if (input.favorited !== undefined) info.push({ name: "Favorited", value: String(input.favorited) });
  if (input.queryJson) info.push({ name: "Replacing query", value: "yes" });
  return { message: "Update this insight?", info };
};
