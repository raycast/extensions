import { LocalStorage, Toast, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { getAccessToken } from "../utils/oauth";
import apiServer from "../utils/api";
import { Status, MastodonError } from "../utils/types";
import { errorHandler } from "../utils/helpers";
import { useCachedState } from "@raycast/utils";

export function useMe() {
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [statuses, setStatuses] = useCachedState<Status[]>("latest_statuses");

  const getUsername = async () => {
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
    } finally {
      setIsLoading(false);
    }
  };

  const getMyStatuses = async () => {
    try {
      await getAccessToken();
      showToast(Toast.Style.Animated, "Loading Statuses...");
      const statuses = await apiServer.fetchUserStatus();

      setStatuses(statuses);
      showToast(Toast.Style.Success, "Statuses loaded");
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
