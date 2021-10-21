import { getLocalStorageItem, LocalStorageValue, setLocalStorageItem, showToast, ToastStyle } from "@raycast/api";
import { useState, useEffect } from "react";
import { fetcher } from "./utils";

interface DataValues {
  userId: LocalStorageValue;
  workspaceId: LocalStorageValue;
  name: LocalStorageValue;
}

export default function useConfig() {
  const [data, setData] = useState<DataValues>({} as DataValues);

  useEffect(() => {
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

        const { data } = await fetcher(`/user`);

        if (data) {
          setLocalStorageItem("userId", data.id);
          setLocalStorageItem("workspaceId", data.defaultWorkspace);
          setLocalStorageItem("name", data.name);
          setData({ userId: data.id, workspaceId: data.defaultWorkspace, name: data.name });
          showToast(ToastStyle.Success, "Clockify is ready");
        } else {
          showToast(ToastStyle.Failure, "An error ccurred");
        }
      }

      fetchUser();
    }

    getStorage();
  }, []);

  return { config: data };
}
