import { useEffect, useState } from "react";
import { showToast, Toast } from "@raycast/api";

import { getLeaderBoard } from "../utils";

export function useLeaderBoard(id?: string) {
  const [data, setData] = useState<WakaTime.LeaderBoard>();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function getData() {
      setIsLoading(true);
      const toast = await showToast(Toast.Style.Animated, "Loading Leaderboard");

      try {
        const data = await getLeaderBoard(id);

        if (!data.ok) throw new Error(data.error);
        setData(data);

        toast.style = Toast.Style.Success;
        toast.title = "Success";
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Error Loading Leaderboard";
        toast.message = (error as Record<string, string>).message;
      }

      setIsLoading(false);
    }

    getData();
  }, []);

  return { data, isLoading };
}
