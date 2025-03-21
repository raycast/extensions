import { LocalStorage, showToast, Toast } from "@raycast/api";
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
      LocalStorage.clear();
      return;
    }

    async function getStorage() {
      const name = await LocalStorage.getItem("name");
      const userId = await LocalStorage.getItem("userId");
      const workspaceId = await LocalStorage.getItem("workspaceId");

      if (userId && workspaceId && name) {
        setData({ userId, workspaceId, name });
        return;
      }

      async function fetchUser() {
        showToast(Toast.Style.Animated, "Loading…");

        const { data, error } = await fetcher(`/user`);

        if (data) {
          LocalStorage.setItem("userId", data.id);
          LocalStorage.setItem("workspaceId", data.defaultWorkspace);
          LocalStorage.setItem("name", data.name);
          setData({ userId: data.id, workspaceId: data.defaultWorkspace, name: data.name });
          showToast(Toast.Style.Success, "Clockify is ready");
        } else if (error === "Unauthorized") {
          showToast(Toast.Style.Failure, "Invalid API Key detected");
          setIsValidToken(false);
        } else {
          showToast(Toast.Style.Failure, "An error ccurred");
        }
      }

      fetchUser();
    }

    getStorage();
  }, [isValidToken]);

  return { config: data, isValidToken, setIsValidToken };
}
