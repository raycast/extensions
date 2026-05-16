import { getInsight } from "../api/insights";
import { getActiveProjectId, projectUrl } from "./_shared";

type Input = {
  /** The numeric insight ID. Get this from `insights-get-all`. */
  insightId: number;
};

export default async function (input: Input) {
  const projectId = await getActiveProjectId();
  const insight = await getInsight(projectId, input.insightId);
  return { ...insight, url: projectUrl(`insights/${insight.short_id}`) };
}
