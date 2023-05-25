import { showToast, Toast, Cache } from "@raycast/api";
import { useEffect, useState, useCallback } from "react";
import { getAccessToken } from "../utils/oauth";
import { MastodonError, Status } from "../utils/types";
import apiServer from "../utils/api";
import { errorHandler } from "../utils/helpers";

const cache = new Cache();

export function useHomeTL() {
  const cached = cache.get("latest_home_statuses");
  const [statuses, setStatuses] = useState<Status[]>(cached ? JSON.parse(cached) : []);
  const [isLoading, setIsLoading] = useState(true);

  const getHomeTL = useCallback(async () => {
    try {
      await getAccessToken();
      showToast(Toast.Style.Animated, "Updating home timeline...");
      const tlStatuses = await apiServer.fetchHomeTL();
      setStatuses(tlStatuses);

      showToast(Toast.Style.Success, "Home timeline updated.");
      cache.set("latest_home_statuses", JSON.stringify(tlStatuses));
    } catch (error) {
      errorHandler(error as MastodonError);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    getHomeTL();
  }, []);

  return {
    statuses,
    getHomeTL,
    isLoading,
  };
}
