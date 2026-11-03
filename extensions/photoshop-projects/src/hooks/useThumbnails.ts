import fs from "node:fs";
import { useEffect, useState } from "react";
import { getCachedThumbnailPath, getOrGenerateThumbnail } from "../services/thumbnails";
import { PhotoshopFile } from "../types";

export function useThumbnails(files: PhotoshopFile[]) {
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});

  useEffect(() => {
    let isCancelled = false;

    const validCached: Record<string, string> = {};
    for (const file of files) {
      const cached = getCachedThumbnailPath(file.path);
      if (cached && fs.existsSync(cached)) {
        validCached[file.path] = cached;
      }
    }

    setThumbnails(validCached);

    async function processQueue() {
      for (const file of files) {
        if (isCancelled) break;
        if (!validCached[file.path]) {
          const generatedPath = await getOrGenerateThumbnail(file.path);
          if (generatedPath && !isCancelled && fs.existsSync(generatedPath)) {
            setThumbnails((prev) => ({
              ...prev,
              [file.path]: generatedPath,
            }));
          }
        }
      }
    }

    processQueue();

    return () => {
      isCancelled = true;
    };
  }, [files]);

  return thumbnails;
}
