import { getPreferenceValues } from "@raycast/api";
import { useMemo } from "react";
import { NativePreferences } from "../types/preferences";
import { ApiTimePolicy } from "./useTimePolicy.types";
import useApi from "./useApi";

export const useTimePolicy = () => {
  const { apiUrl, apiToken } = getPreferenceValues<NativePreferences>();
  const { useFetchRai } = useApi();


  const headers = useMemo(
    () => ({
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    }),
    [apiToken]
  );

  const {
    data: timePolicies,
    error,
    isLoading,
  } = useFetchRai<ApiTimePolicy>(`${apiUrl}/timeschemes`, {
    headers,
    keepPreviousData: true,
  });

  if (error) console.error("Error while fetching Time Policies", error);

  return {
    timePolicies,
    error,
    isLoading,
  };
};
