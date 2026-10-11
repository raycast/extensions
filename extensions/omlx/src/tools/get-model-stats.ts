import { fetchAdminStats } from "../lib/omlx";

type Input = {
  /** The model ID to get stats for. Use list-models to find model IDs. */
  modelId: string;
  /** Stats scope: "session" for current session, "alltime" for cumulative. Defaults to "session". */
  scope?: "session" | "alltime";
};

export default async function (input: Input) {
  const stats = await fetchAdminStats(input.scope ?? "session", input.modelId);
  return {
    modelId: input.modelId,
    scope: input.scope ?? "session",
    avgPrefillTps: stats.avg_prefill_tps,
    avgGenerationTps: stats.avg_generation_tps,
    totalRequests: stats.total_requests,
    totalPromptTokens: stats.total_prompt_tokens,
    totalCompletionTokens: stats.total_completion_tokens,
    cacheEfficiency: stats.cache_efficiency,
  };
}
