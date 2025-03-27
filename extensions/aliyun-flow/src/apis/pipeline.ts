import { DOMAIN, ORGANIZATION_ID, YUNXIAO_HEADERS } from "../constants";
import { Run } from "../types";

export async function fetchPipelineRuns(pipelineId: number): Promise<Run[]> {
  const result = await fetch(`${DOMAIN}/oapi/v1/flow/organizations/${ORGANIZATION_ID}/pipelines/${pipelineId}/runs`, {
    headers: YUNXIAO_HEADERS,
  });

  if (!result.ok) {
    throw new Error(`${result.statusText} (${result.status})`);
  }

  const data: Run[] = await result.json();
  return data;
}
