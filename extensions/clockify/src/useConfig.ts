import { LocalStorage, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { fetcher, resolveWorkspaceId, validateToken } from "./utils";
import { DataValues, User } from "./types";

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
      const name = await LocalStorage.getItem<string>("name");
      const userId = await LocalStorage.getItem<string>("userId");
      const workspaceId = await LocalStorage.getItem<string>("workspaceId");

      if (userId && workspaceId && name) {
        setData({ userId, workspaceId, name });
        return;
      }

      async function fetchUser() {
        showToast(Toast.Style.Animated, "Loading…");

        const { data, error } = await fetcher(`/user`);

        if (data) {
          const user = data as User;

          // setItem cannot store undefined, so an unresolved workspace means workspaceId never
          // lands in LocalStorage, the guard above fails on every mount, and every request goes to
          // /workspaces/undefined/...
          const workspaceId = await resolveWorkspaceId(user);

          if (!workspaceId) {
            showToast(Toast.Style.Failure, "No Clockify workspace found for this API key");
            return;
          }

          // Await these, and write them one at a time rather than with Promise.all: consumers read
          // the ids back out of LocalStorage as soon as config is published, and concurrent writes
          // can be lost — leaving workspaceId absent while userId and name land.
          await LocalStorage.setItem("userId", user.id);
          await LocalStorage.setItem("workspaceId", workspaceId);
          await LocalStorage.setItem("name", user.name);

          setData({ userId: user.id, workspaceId, name: user.name });
          showToast(Toast.Style.Success, "Clockify is ready");
        } else if (error === "Unauthorized") {
          showToast(Toast.Style.Failure, "Invalid API Key detected");
          setIsValidToken(false);
        } else {
          showToast(Toast.Style.Failure, "An error occurred");
        }
      }

      fetchUser();
    }

    getStorage();
  }, [isValidToken]);

  return { config: data, isValidToken, setIsValidToken };
}
