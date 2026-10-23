import { fetchFromApi, buildApiUrl, getAccountId } from "./api";
import { RunsFetchResponse } from "./types";

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
