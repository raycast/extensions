import { clearLocalStorage, getLocalStorageItem, setLocalStorageItem, showToast, ToastStyle } from "@raycast/api";
import { useState, useEffect } from "react";
import { fetcher, validateToken } from "./utils";
import { DataValues } from "./types";

interface ConfigProps {
  config: DataValues;
  isValidToken: boolean;
  setIsValidToken: (state: boolean) => void;
}

export default function useConfig(): ConfigProps {
  const [isValidToken, setIsValidToken] = useState<boolean>(() => validateToken());
  const [data, setData] = useState<DataValues>({} as DataValues);

  useEffect(() => {
    if (!isValidToken) {
      clearLocalStorage();
      return;
    }

    async function getStorage() {
      const name = await getLocalStorageItem("name");
      const userId = await getLocalStorageItem("userId");
      const workspaceId = await getLocalStorageItem("workspaceId");

      if (userId && workspaceId && name) {
        setData({ userId, workspaceId, name });
        return;
      }

      async function fetchUser() {
        showToast(ToastStyle.Animated, "Loading…");

        const { data, error } = await fetcher(`/user`);

        if (data) {
          setLocalStorageItem("userId", data.id);
          setLocalStorageItem("workspaceId", data.defaultWorkspace);
          setLocalStorageItem("name", data.name);
          setData({ userId: data.id, workspaceId: data.defaultWorkspace, name: data.name });
          showToast(ToastStyle.Success, "Clockify is ready");
        } else if (error === "Unauthorized") {
          showToast(ToastStyle.Failure, "Invalid API Key detected");
          setIsValidToken(false);
        } else {
          showToast(ToastStyle.Failure, "An error ccurred");
        }
      }

      fetchUser();
    }

    getStorage();
  }, [isValidToken]);

  return { config: data, isValidToken, setIsValidToken };
}
