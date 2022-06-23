import { showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";

import { getProjects } from "../utils";

export function useProjects() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [data, setData] = useState<WakaTime.Projects>();

  useEffect(() => {
    async function getData() {
      setIsLoading(true);

      try {
        const data = await getProjects();

        if (!data.ok) throw new Error(data.error);
        setData(data);
      } catch (error) {
        await showToast(Toast.Style.Failure, "Error Loading Projects", (error as Record<string, string>).message);
      }

      setIsLoading(false);
    }
    getData();
  }, []);

  return { data, isLoading };
}
