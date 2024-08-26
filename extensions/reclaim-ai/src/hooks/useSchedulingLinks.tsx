import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useMemo } from "react";
import { NativePreferences } from "../types/preferences";
import { ApiSchedulingLink, ApiSchedulingLinkGroups } from "./useSchedulingLinks.types";

export const useSchedulingLinks = () => {
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
    data: schedulingLinks,
    error: schedulingLinksError,
    isLoading: schedulingLinksIsLoading,
  } = useFetch<ApiSchedulingLink>(`${apiUrl}/scheduling-link`, {
    headers,
    keepPreviousData: true,
    method: "GET",
  });

  const {
    data: schedulingLinksGroups,
    error: schedulingLinksGroupsError,
    isLoading: schedulingLinksGroupsIsLoading,
  } = useFetch<ApiSchedulingLinkGroups>(`${apiUrl}/scheduling-link/group`, {
    headers,
    keepPreviousData: true,
    method: "GET",
  });

  if (schedulingLinksError) console.error("Error while fetching Scheduling Links", schedulingLinksError);
  if (schedulingLinksGroupsError)
    console.error("Error while fetching Scheduling Links Groups", schedulingLinksGroupsError);

  return {
    schedulingLinks,
    schedulingLinksError,
    schedulingLinksIsLoading,
    schedulingLinksGroups,
    schedulingLinksGroupsError,
    schedulingLinksGroupsIsLoading,
  };
};
