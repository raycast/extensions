import { useEffect, useState } from "react";
import { showToast, Toast } from "@raycast/api";

import { getPrivateLeaderBoards } from "../utils";

export function usePrivateLeaderBoards() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [data, setData] = useState<WakaTime.PrivateLeaderBoards>();

  useEffect(() => {
    async function getData() {
      setIsLoading(true);
      const toast = await showToast(Toast.Style.Animated, "Loading Private Leaderboards");

      try {
        const data = await getPrivateLeaderBoards();

        if (!data.ok) throw new Error(data.error);
        setData(data);

        toast.style = Toast.Style.Success;
        toast.title = "Finished.";
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Error Loading Private Leaderboards";
        toast.message = (error as Record<string, string>).message;
      }

      setIsLoading(false);
    }

    getData();
  }, []);

  return { data, isLoading };
}
