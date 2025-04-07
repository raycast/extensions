import { Dispatch, SetStateAction, useEffect } from "react";
import fs from "fs";
import { DownloadedMedia } from "./types";

interface UseValidateFilesArgs {
  mediaItems: DownloadedMedia[];
  setMediaItems: Dispatch<SetStateAction<DownloadedMedia[]>>;
  saveDownloadHistory: (history: DownloadedMedia[]) => void;
}

export const useValidateFiles = ({ mediaItems, setMediaItems, saveDownloadHistory }: UseValidateFilesArgs) => {
  useEffect(() => {
    // Check if files exist and remove duplicates on component load
    const validateMediaFiles = () => {
      // Filter out non-existent files and track seen paths to remove duplicates
      const seenPaths = new Set<string>();
      const validatedItems = mediaItems.filter((item) => {
        const fileExists = fs.existsSync(item.path);
        const isDuplicate = seenPaths.has(item.path);

        if (fileExists && !isDuplicate) {
          seenPaths.add(item.path);
          return true;
        }
        return false;
      });

      // Update state and save to file if changes were made
      if (validatedItems.length !== mediaItems.length) {
        console.log("Removing non-existent files and duplicates", validatedItems, mediaItems);
        setMediaItems(validatedItems);
        saveDownloadHistory(validatedItems);
        console.log("Media files validated: removed non-existent files and duplicates");
      }
    };

    if (mediaItems.length > 0) {
      validateMediaFiles();
    }
  }, [mediaItems.length]);
};
