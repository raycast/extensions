import { useEffect, useState } from "react";
import { showToast, ToastStyle } from "@raycast/api";
import { ClickUpClient } from "../utils/clickUpClient";
import type { FolderItem, FoldersResponse } from "../types/folders.dt";

function useFolders(spaceId: string) {
  const [folders, setFolders] = useState<FolderItem[] | undefined>(undefined);

  useEffect(() => {
    async function getTeams() {
      try {
        const response = await ClickUpClient<FoldersResponse>(`/space/${spaceId}/folder?archived=false`);
        setFolders(response.data?.folders ?? []);
      } catch (error: any) {
        setFolders([]);
        error?.response?.data
          ? await showToast(
              ToastStyle.Failure,
              "Something went wrong",
              `${error?.response?.data?.err} - ${error?.response?.data?.ECODE}`
            )
          : await showToast(ToastStyle.Failure, "Something went wrong");
      }
    }

    getTeams().then((r) => r);
  }, [spaceId]);

  return folders;
}

export { useFolders };
