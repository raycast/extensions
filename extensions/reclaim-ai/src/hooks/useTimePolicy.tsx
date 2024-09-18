import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useMemo } from "react";
import { NativePreferences } from "../types/preferences";
import { ApiTimePolicy } from "./useTimePolicy.types";

export const useTimePolicy = () => {
  const { apiUrl, apiToken } = getPreferenceValues<NativePreferences>();

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
  } = useFetch<ApiTimePolicy>(`${apiUrl}/timeschemes`, {
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
