import { fetchFromApi, buildApiUrl, getAccountId } from "./api";
import { JobsFetchResponse } from "./types";

export const returnJobs = async (projectId?: number): Promise<JobsFetchResponse> => {
  const accountId = getAccountId();
  const params: Record<string, string | number> = {
    account_id: accountId,
    limit: 100,
    order_by: "-updated_at",
  };

  if (projectId) {
    params.project_id = projectId;
  }

  const url = buildApiUrl("/jobs/", params);
  return fetchFromApi<JobsFetchResponse[number]>(url, "Could not fetch jobs, check your credentials");
};
