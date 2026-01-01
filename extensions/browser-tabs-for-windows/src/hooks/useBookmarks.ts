import { useState, useEffect, useCallback } from "react";
import { getBookmarks, Bookmark } from "../utils/tabs-helper";
import { showToast, Toast } from "@raycast/api";

export function useBookmarks() {
  const [data, setData] = useState<Bookmark[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const bookmarks = await getBookmarks();
      setData(bookmarks);
    } catch (error) {
      console.error(error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load bookmarks",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, mutate: fetchData };
}
