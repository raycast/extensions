import { fetchFromApi, fetchOneFromApi, buildApiUrl, getAccountId } from "./api";
import { RunModel, RunsFetchResponse } from "./types";

export const returnRuns = async (jobId?: number): Promise<RunsFetchResponse> => {
  const accountId = getAccountId();
  const params: Record<string, string | number> = {
    account_id: accountId,
    include_related: JSON.stringify(["job"]),
    limit: 100,
    order_by: "-finished_at",
  };
  if (jobId) {
    params.job_definition_id = jobId;
  }
  const url = buildApiUrl("/runs/", params);
  return fetchFromApi<RunsFetchResponse[number]>(url, "Could not fetch runs, check your credentials", 100);
};

export const fetchRun = (runId: number): Promise<RunModel | null> =>
  fetchOneFromApi<RunModel>(
    buildApiUrl(`/runs/${runId}/`, { include_related: JSON.stringify(["job", "trigger", "environment"]) }),
    `Could not fetch run ${runId}`,
  );
