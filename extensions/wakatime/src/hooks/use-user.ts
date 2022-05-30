import { useEffect, useState } from "react";
import { showToast, Toast } from "@raycast/api";

import { getUser } from "../utils";

export function useUser() {
  const [data, setData] = useState<WakaTime.User>();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function getData() {
      setIsLoading(true);
      const toast = await showToast(Toast.Style.Animated, "Loading Summary");

      try {
        const data = await getUser();

        if (!data.ok) throw new Error(data.error);
        setData(data);

        toast.style = Toast.Style.Success;
        toast.title = "Done!";
      } catch (err) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed Loading Summary";
        toast.message = (err as Record<string, string>).message;
      }

      setIsLoading(false);
    }

    getData();
  }, []);

  return { ...(data ?? {}), isLoading };
}
