import { useEffect, useState } from "react";
import { getCachedThumbnailPath, getOrGenerateThumbnail } from "../services/thumbnails";
import { PhotoshopFile } from "../types";

export function useThumbnails(files: PhotoshopFile[]) {
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});

  useEffect(() => {
    let isCancelled = false;

    const cachedMap: Record<string, string> = {};
    for (const file of files) {
      const cached = getCachedThumbnailPath(file.path);
      if (cached) {
        cachedMap[file.path] = cached;
      }
    }

    if (Object.keys(cachedMap).length > 0) {
      setThumbnails((prev) => ({ ...prev, ...cachedMap }));
    }

    async function processQueue() {
      for (const file of files) {
        if (isCancelled) break;
        if (!cachedMap[file.path]) {
          const generatedPath = await getOrGenerateThumbnail(file.path);
          if (generatedPath && !isCancelled) {
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
