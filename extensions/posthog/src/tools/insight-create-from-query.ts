import { Tool } from "@raycast/api";

import { createInsight } from "../api/insights";
import { getActiveProjectId, parseJsonInput, projectUrl } from "./_shared";

type Input = {
  /** Insight name. */
  name: string;
  /** Optional description. */
  description?: string;
  /**
   * The PostHog query node, encoded as a JSON string. Examples:
   * - `{"kind":"TrendsQuery","series":[...]}`
   * - `{"kind":"HogQLQuery","query":"SELECT ..."}`
   */
  queryJson: string;
  /** Whether to favorite the insight. */
  favorited?: boolean;
};

export default async function (input: Input) {
  const projectId = await getActiveProjectId();
  const query = parseJsonInput<Record<string, unknown>>(input.queryJson, "queryJson");
  const insight = await createInsight(projectId, {
    name: input.name,
    description: input.description ?? "",
    query,
    favorited: input.favorited ?? false,
    saved: true,
  });
  return { ...insight, url: projectUrl(`insights/${insight.short_id}`) };
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  let queryKind = "custom";
  try {
    queryKind = String(JSON.parse(input.queryJson).kind ?? "custom");
  } catch {
    /* ignore parse errors here — the handler will surface them */
  }
  return {
    message: `Save insight "${input.name}"?`,
    info: [
      { name: "Name", value: input.name },
      { name: "Query kind", value: queryKind },
    ],
  };
};
