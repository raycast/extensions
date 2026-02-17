import { showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { Tag } from "../types";
import { fetchTags } from "../api";

export function usePinboardTags() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const fetched = await fetchTags();
        setTags(fetched);
      } catch (error) {
        console.error("Failed to fetch tags:", error);
        showToast({ title: "Failed to fetch tags", message: String(error), style: Toast.Style.Failure });
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  return { tags, isLoading };
}
