import { runQuery } from "../api/query";
import { getActiveProjectId } from "./_shared";

type Input = {
  /** Number of days of cost data to fetch. Defaults to 7. */
  days?: number;
};

export default async function (input: Input) {
  const projectId = await getActiveProjectId();
  // PostHog doesn't expose LLM costs as a REST endpoint — it's a TrendsQuery summing the
  // `$ai_total_cost_usd` property on `$ai_generation` events, broken down by `$ai_model`.
  const trendsQuery = {
    kind: "TrendsQuery",
    dateRange: { date_from: `-${input.days ?? 7}d`, date_to: null },
    filterTestAccounts: true,
    series: [
      {
        event: "$ai_generation",
        name: "$ai_generation",
        math: "sum",
        math_property: "$ai_total_cost_usd",
        kind: "EventsNode",
      },
    ],
    breakdownFilter: { breakdown_type: "event", breakdown: "$ai_model" },
  };
  const result = await runQuery(projectId, trendsQuery);
  return { results: result.results, days: input.days ?? 7 };
}
