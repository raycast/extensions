import { open, showToast, Toast } from "@raycast/api";
import { SchedulingLink } from "../types/scheduling-link";
import useApi from "./useApi";
import { ApiSchedulingLink, ApiSchedulingLinkGroups } from "./useSchedulingLinks.types";
import { fetchPromise } from "../utils/fetcher";

export const useSchedulingLinks = () => {
  const {
    data: schedulingLinks,
    error: schedulingLinksError,
    isLoading: schedulingLinksIsLoading,
  } = useApi<ApiSchedulingLink>("/scheduling-link");

  const {
    data: schedulingLinksGroups,
    error: schedulingLinksGroupsError,
    isLoading: schedulingLinksGroupsIsLoading,
  } = useApi<ApiSchedulingLinkGroups>("/scheduling-link/group");

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
    const [oneOff, error] = await fetchPromise<SchedulingLink>("/scheduling-link/derivative", {
      init: { method: "POST" },
      payload: { parentId: link.id },
    });

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
