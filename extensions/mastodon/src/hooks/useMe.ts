import { LocalStorage, Cache, Toast, showToast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { getAccessToken } from "../utils/oauth";
import apiServer from "../utils/api";
import { Status, MastodonError } from "../utils/types";
import { errorHandler } from "../utils/helpers";

const cache = new Cache();

export function useMe() {
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const cached = cache.get("latest_statuses");
  const [statuses, setStatuses] = useState<Status[]>(cached ? JSON.parse(cached) : []);

  const getUsername = useCallback(async () => {
    try {
      await getAccessToken();
      const storedUsername = await LocalStorage.getItem<string>("account-username");
      if (storedUsername) {
        setUsername(storedUsername);
      } else {
        const { username } = await apiServer.fetchAccountInfo();
        setUsername(username);
        await LocalStorage.setItem("account-username", username);
      }
    } catch (error) {
      errorHandler(error as MastodonError);
    }
  }, []);

  const getMyStatuses = async () => {
    try {
      await getAccessToken();
      showToast(Toast.Style.Animated, "Loading Statuses...");
      const status = await apiServer.fetchUserStatus();
      setStatuses(statuses);
      showToast(Toast.Style.Success, "Statuses loaded");
      cache.set("latest_statuses", JSON.stringify(status));
    } catch (error) {
      errorHandler(error as MastodonError);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getUsername();
  }, []);

  return {
    username,
    isLoading,
    statuses,
    getUsername,
    getMyStatuses,
  };
}
