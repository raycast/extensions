import { fetchFromApi, buildApiUrl, getAccountId } from "./api";
import { RunsFetchResponse } from "./types";

export const returnRuns = async (): Promise<RunsFetchResponse> => {
  const accountId = getAccountId();
  const url = buildApiUrl("/runs/", {
    account_id: accountId,
    include_related: "job",
    limit: 100,
    order_by: "-finished_at",
  });
  return fetchFromApi<RunsFetchResponse[number]>(url, "Could not fetch runs, check your credentials");
};
