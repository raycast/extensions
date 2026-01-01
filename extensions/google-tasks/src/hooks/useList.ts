import { useState, useEffect } from "react";
import { showToast, Toast } from "@raycast/api";
import { fetchLists } from "../api/endpoints";

interface UseListError {
  title: string;
  message: string;
}

export function useList(targetListName: string | undefined) {
  const [isLoading, setIsLoading] = useState(true);
  const [list, setList] = useState<{ id: string; title: string } | null>(null);
  const [error, setError] = useState<UseListError | null>(null);

  useEffect(() => {
    const handleError = (errorInfo: UseListError) => {
      setError(errorInfo);
      showToast({
        style: Toast.Style.Failure,
        title: errorInfo.title,
        message: errorInfo.message,
      });
      setIsLoading(false);
    };

    (async () => {
      setIsLoading(true);
      setError(null);
      setList(null);

      try {
        if (!targetListName || targetListName.trim() === "") {
          handleError({
            title: "No list specified",
            message: "Please provide a list name or set a default list in preferences",
          });
          return;
        }

        const fetchedLists = await fetchLists();
        const matchedList = fetchedLists.find(
          (listItem) => listItem.title.toLowerCase() === targetListName.toLowerCase(),
        );

        if (matchedList) {
          setList(matchedList);
          setIsLoading(false);
        } else {
          handleError({
            title: "List not found",
            message: `No list found with name "${targetListName}"`,
          });
        }
      } catch (err) {
        console.error(err);
        handleError({
          title: "Failed to fetch lists",
          message: String(err),
        });
      }
    })();
  }, [targetListName]);

  return { isLoading, list, error };
}
