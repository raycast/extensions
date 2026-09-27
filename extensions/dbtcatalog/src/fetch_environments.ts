import { fetchFromApi, buildApiUrl, getAccountId } from "./api";
import { EnvironmentsFetchResponse } from "./types";

export const returnEnvironments = async (projectId?: number): Promise<EnvironmentsFetchResponse> => {
  const accountId = getAccountId();
  const params: Record<string, string | number> = {
    account_id: accountId,
    limit: 100,
  };

  if (projectId) {
    params.project_id = projectId;
  }

  const url = buildApiUrl("/environments/", params);
  return fetchFromApi<EnvironmentsFetchResponse[number]>(url, "Could not fetch environments, check your credentials");
};
