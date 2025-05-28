import { useState, useEffect } from "react";
import { showToast, Toast } from "@raycast/api";

import { getFabricClient, Tag } from "../api/fabricClient";

export function useTags() {
  const [tags, setTags] = useState<Tag[]>([]);

  useEffect(() => {
    const fetchTags = async () => {
      const fabricClient = getFabricClient();
      try {
        const tagsList = await fabricClient.listTags();
        setTags(tagsList);
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch tags",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    };

    fetchTags();
  }, []);

  return tags;
}
