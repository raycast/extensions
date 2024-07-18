import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useMemo } from "react";
import { NativePreferences } from "../types/preferences";
import { ApiResponseMoment } from "./useEvent.types";

export const useMoment = () => {
  const { apiUrl, apiToken } = getPreferenceValues<NativePreferences>();

  const headers = useMemo(
    () => ({
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    }),
    [apiToken]
  );

  const useFetchMomentNext = () =>
    useFetch<ApiResponseMoment>(`${apiUrl}/moment/next`, {
      headers,
      keepPreviousData: true,
    });

  return {
    useFetchMomentNext,
  };
};
