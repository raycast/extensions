import { fetchFromApi, buildApiUrl, getAccountId } from "./api";
import { ProjectsFetchResponse } from "./types";

export const returnProjects = async (): Promise<ProjectsFetchResponse> => {
  const accountId = getAccountId();
  const url = buildApiUrl("/projects/", { account_id: accountId, limit: 100 });
  return fetchFromApi<ProjectsFetchResponse[number]>(url, "Could not fetch projects, check your credentials");
};
