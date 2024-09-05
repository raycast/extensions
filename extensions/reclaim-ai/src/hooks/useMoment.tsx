import { getPreferenceValues } from "@raycast/api";
import { useMemo } from "react";
import { NativePreferences } from "../types/preferences";
import { ApiResponseMoment } from "./useEvent.types";
import useApi from "./useApi";

export const useMoment = () => {
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
    data: momentData,
    error,
    isLoading,
  } = useFetchRai<ApiResponseMoment>(`${apiUrl}/moment/next`, {
    headers,
    keepPreviousData: true,
  });

  if (error) console.error("Error while fetching Moment Next", error);

  return {
    momentData,
    isLoading,
  };
};
