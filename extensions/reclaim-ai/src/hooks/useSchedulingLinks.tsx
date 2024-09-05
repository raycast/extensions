import { getPreferenceValues, showToast, Toast, open } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useMemo } from "react";
import { NativePreferences } from "../types/preferences";
import { ApiSchedulingLink, ApiSchedulingLinkGroups } from "./useSchedulingLinks.types";
import { SchedulingLink } from "../types/scheduling-link";
import useApi from "./useApi";

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

export const useSchedulingLinkActions = (link: SchedulingLink) => {
  const createOneOffLink = async () => {
    const { fetchPromise } = useApi();

    const [oneOff, error] = await fetchPromise<SchedulingLink>(
      "/scheduling-link/derivative",
      { method: "POST" },
      { parentId: link.id }
    );

    if (!error && oneOff) {
      open(`https://app.reclaim.ai/scheduling-links?personalize=${oneOff.id}`);
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error creating one-off link. Try using the reclaim.ai web app.",
      });
    }
  };

  const createShareLink = async () => {
    open(`https://app.reclaim.ai/quick-forms/scheduling-links/${link.id}/available-times`);
  };

  return {
    createOneOffLink,
    createShareLink,
  };
};
