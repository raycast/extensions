import { axiosPromiseData } from "../utils/axiosPromise";
import reclaimApi from "./useApi";
import { ApiSchedulingLink, ApiSchedulingLinkGroups } from "./useSchedulingLinks.types";

const useSchedulingLinks = () => {
  const { fetcher } = reclaimApi();

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
    getSchedulingLinks,
    getSchedulingLinksGroups,
  };
};

export { useSchedulingLinks };
