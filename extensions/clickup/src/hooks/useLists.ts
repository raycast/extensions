import { useEffect, useState } from "react";
import { showToast, ToastStyle } from "@raycast/api";
import { ClickUpClient } from "../utils/clickUpClient";
import type { ListItem, ListsResponse } from "../types/lists.dt";

function useLists(folderId: string) {
  const [lists, setLists] = useState<ListItem[] | undefined>(undefined);

  useEffect(() => {
    async function getTeams() {
      try {
        const response = await ClickUpClient<ListsResponse>(`/folder/${folderId}/list?archived=false`);
        setLists(response.data?.lists ?? []);
      } catch (error: any) {
        setLists([]);
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
  }, [folderId]);

  return lists;
}

export { useLists };
