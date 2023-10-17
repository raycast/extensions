import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { API_URL } from "../constants";
import { Run, Val } from "../types";

const { apiToken } = getPreferenceValues();

type RunsResponse = {
  data: Run[];
};

export const useRuns = (valId?: Val["id"]) => {
  const endpoint = valId ? `${API_URL}/vals/${valId}/runs` : `${API_URL}/me/runs`;
  const { isLoading, data, error } = useFetch<RunsResponse>(endpoint, {
    keepPreviousData: true,
    headers: {
      Authorization: `Bearer ${apiToken}`,
    },
  });
  // eslint-disable-next-line
  if (true) {
    //! Temporarily disable recent runs until API is updated
    return { isloading: false, vals: undefined, links: undefined };
  }
  // eslint-disable-next-line
  // @ts-ignore
  return { isLoading, error, runs: data?.data ? data.data : undefined };
};
