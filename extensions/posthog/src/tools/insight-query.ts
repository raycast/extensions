import { getInsight } from "../api/insights";
import { runQuery } from "../api/query";
import { getActiveProjectId, projectUrl } from "./_shared";

type Input = {
  /** The numeric insight ID. Get this from `insights-get-all`. */
  insightId: number;
};

export default async function (input: Input) {
  const projectId = await getActiveProjectId();
  const insight = await getInsight(projectId, input.insightId);
  if (!insight.query) {
    throw new Error("This insight has no query node attached.");
  }
  const queryResult = await runQuery(projectId, insight.query);
  return {
    insight: {
      id: insight.id,
      short_id: insight.short_id,
      name: insight.name || insight.derived_name,
      url: projectUrl(`insights/${insight.short_id}`),
    },
    results: queryResult.results,
    columns: queryResult.columns,
    hogql: queryResult.hogql,
  };
}
