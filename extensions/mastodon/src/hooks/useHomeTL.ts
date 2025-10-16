import { showToast, Toast } from "@raycast/api";
import { useEffect, useState, useCallback } from "react";
import { getAccessToken } from "../utils/oauth";
import { MastodonError, Status } from "../utils/types";
import apiServer from "../utils/api";
import { errorHandler } from "../utils/helpers";
import { useCachedState } from "@raycast/utils";

export function useHomeTL() {
  const [statuses, setStatuses] = useCachedState<Status[]>("latest_home_statuses");
  const [isLoading, setIsLoading] = useState(true);

  const getHomeTL = useCallback(async () => {
    try {
      await getAccessToken();
      showToast(Toast.Style.Animated, "Updating home timeline...");
      const tlStatuses = await apiServer.fetchHomeTL();

      setStatuses(tlStatuses);
      showToast(Toast.Style.Success, "Home timeline updated.");
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
