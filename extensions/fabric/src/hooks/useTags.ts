import { useState, useEffect } from "react";
import { showFailureToast } from "@raycast/utils";

import { getFabricClient, Tag } from "../api/fabricClient";

export function useTags() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTags = async () => {
      setIsLoading(true);

      const fabricClient = getFabricClient();
      try {
        const tagsList = await fabricClient.listTags();
        setTags(tagsList);
      } catch (error) {
        showFailureToast(error, { title: "Failed to fetch tags" });
      }

      setIsLoading(false);
    };

    fetchTags();
  }, []);

  return { tags, isLoading };
}
