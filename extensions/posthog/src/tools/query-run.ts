import { runQuery } from "../api/query";
import { getActiveProjectId } from "./_shared";

type Input = {
  /**
   * HogQL (PostHog's ClickHouse-flavored SQL) to execute. Required.
   *
   * The `events` table has columns: `timestamp`, `event`, `person_id`, `distinct_id`, `properties`
   * (a JSON map — access values via `properties.$browser`, `properties.$current_url`, etc.).
   *
   * Examples:
   * - `SELECT count() FROM events WHERE event = '$pageview' AND timestamp > now() - INTERVAL 7 DAY`
   * - `SELECT count(DISTINCT person_id) AS dau, toDate(timestamp) AS day FROM events WHERE timestamp > now() - INTERVAL 7 DAY GROUP BY day ORDER BY day`
   * - `SELECT properties.$browser, count() FROM events WHERE event = 'signup' GROUP BY properties.$browser ORDER BY count() DESC LIMIT 10`
   *
   * For simple "count of one event over time" questions, prefer `query-trend` instead.
   * For funnels and retention, encode the query as JSON and pass via `queryJson`.
   */
  hogql: string;
};

export default async function (input: Input) {
  const projectId = await getActiveProjectId();
  const result = await runQuery(projectId, { kind: "HogQLQuery", query: input.hogql });
  return {
    hogql: input.hogql,
    results: result.results,
    columns: result.columns,
    types: result.types,
  };
}
