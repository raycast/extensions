import { useEffect, useState } from "react";
import { getOrGenerateThumbnail } from "../services/thumbnails";
import { PremiereFile } from "../types";

export function useThumbnails(files: PremiereFile[]): Record<string, string> {
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});

  useEffect(() => {
    let isCancelled = false;

    async function loadThumbnails() {
      const updates: Record<string, string> = {};

      for (const file of files) {
        if (isCancelled) break;
        if (thumbnails[file.path]) continue;

        try {
          const thumb = await getOrGenerateThumbnail(file);
          if (thumb) {
            updates[file.path] = thumb;
          }
        } catch {
          // Ignore failures for individual files
        }
      }

      if (!isCancelled && Object.keys(updates).length > 0) {
        setThumbnails((prev) => ({ ...prev, ...updates }));
      }
    }

    if (files.length > 0) {
      loadThumbnails();
    }

    return () => {
      isCancelled = true;
    };
  }, [files]);

  return thumbnails;
}
