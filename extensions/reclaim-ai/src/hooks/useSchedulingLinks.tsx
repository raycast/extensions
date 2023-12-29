import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useMemo } from "react";
import { NativePreferences } from "../types/preferences";
import { axiosPromiseData } from "../utils/axiosPromise";
import reclaimApi from "./useApi";
import { ApiSchedulingLink, ApiSchedulingLinkGroups } from "./useSchedulingLinks.types";

export const useSchedulingLinks = () => {
  const { fetcher } = reclaimApi();

  const { apiUrl, apiToken } = getPreferenceValues<NativePreferences>();

  const headers = useMemo(
    () => ({
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    }),
    [apiToken]
  );

  const useFetchSchedulingLinks = () =>
    useFetch<ApiSchedulingLink>(`${apiUrl}/scheduling-link`, {
      headers,
      keepPreviousData: true,
      method: "GET",
    });

  const useSchedulingLinksGroups = () =>
    useFetch<ApiSchedulingLinkGroups>(`${apiUrl}/scheduling-link/group`, {
      headers,
      keepPreviousData: true,
      method: "GET",
    });

  const getSchedulingLinks = async () => {
    try {
      const [schedulingLinks, error] = await axiosPromiseData<ApiSchedulingLink>(
        fetcher("/scheduling-link", {
          method: "GET",
        })
      );
      if (!schedulingLinks || error) throw error;
      return schedulingLinks;
    } catch (error) {
      console.error("Error while fetching scheduling links", error);
    }
  };

  const getSchedulingLinksGroups = async () => {
    try {
      const [schedulingLinksGroups, error] = await axiosPromiseData<ApiSchedulingLinkGroups>(
        fetcher("/scheduling-link/group", {
          method: "GET",
        })
      );
      if (!schedulingLinksGroups || error) throw error;
      return schedulingLinksGroups;
    } catch (error) {
      console.error("Error while fetching scheduling links groups", error);
    }
  };

  return {
    useFetchSchedulingLinks,
    useSchedulingLinksGroups,
    getSchedulingLinks,
    getSchedulingLinksGroups,
  };
};
