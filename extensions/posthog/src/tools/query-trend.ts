import { runQuery } from "../api/query";
import { getActiveProjectId } from "./_shared";

type Input = {
  /**
   * The event name to chart over time. Required.
   * Examples: "$pageview", "signup_completed", "onboarding_flow_entered".
   */
  event: string;
  /**
   * Date range in PostHog's relative syntax. Examples: "-7d" (last 7 days), "-30d", "-24h", "-1m".
   * Defaults to "-7d".
   */
  dateFrom?: string;
  /**
   * Optional property name to break the trend down by. Examples: "$browser", "$current_url", "$country".
   * Omit for a single total line.
   */
  breakdown?: string;
};

export default async function (input: Input) {
  const projectId = await getActiveProjectId();
  const query: Record<string, unknown> = {
    kind: "TrendsQuery",
    series: [{ kind: "EventsNode", event: input.event }],
    dateRange: { date_from: input.dateFrom ?? "-7d" },
  };
  if (input.breakdown) {
    query.breakdownFilter = { breakdown_type: "event", breakdown: input.breakdown };
  }
  const result = await runQuery(projectId, query);
  return {
    query,
    results: result.results,
    columns: result.columns,
  };
}
