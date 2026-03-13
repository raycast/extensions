import { useState, useEffect } from "react";
import { showToast, Toast, popToRoot, getSelectedFinderItems } from "@raycast/api";
import { Status } from "../common/types";

export const useFetchSelectedFinderItems = (selectFileInFinder: boolean) => {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>("init");

  const fetchSelectedFinderItems = async () => {
    setIsLoading(true);

    if (selectFileInFinder) {
      try {
        const finderSelectedItems = await getSelectedFinderItems();
        if (finderSelectedItems.length === 0) {
          await showToast(Toast.Style.Failure, "You must select a single file.", "Please select a file.");
          setStatus("failure");
          popToRoot();
          return;
        }
        setSelectedFiles(finderSelectedItems.map((item) => item.path));
      } catch (error) {
        await showToast(Toast.Style.Failure, "Finder Select Error", "Finder isn't the frontmost application");
        setStatus("failure");
        popToRoot();
      } finally {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchSelectedFinderItems();
  }, [selectFileInFinder]);

  return { isLoading, selectedFiles, status };
};
