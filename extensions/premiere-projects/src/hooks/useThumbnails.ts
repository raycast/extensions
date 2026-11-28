import { useEffect, useRef, useState } from "react";
import { getOrGenerateThumbnail } from "../services/thumbnails";
import { PremiereFile } from "../types";

const CONCURRENCY_LIMIT = 4;

export function useThumbnails(files: PremiereFile[]): Record<string, string> {
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const cacheRef = useRef<Map<string, { path: string; mtime: number }>>(new Map());

  useEffect(() => {
    let isCancelled = false;

    async function processQueue() {
      // Find files that are not cached or have changed since last thumbnail generation
      const needed = files.filter((f) => {
        const cached = cacheRef.current.get(f.path);
        const fileMtime = f.lastModifiedDate ? f.lastModifiedDate.getTime() : 0;
        return !cached || cached.mtime !== fileMtime;
      });

      if (needed.length === 0) return;

      let index = 0;

      async function worker() {
        while (index < needed.length && !isCancelled) {
          const current = needed[index++];
          if (!current) break;

          try {
            const thumb = await getOrGenerateThumbnail(current);
            if (!isCancelled && thumb) {
              const fileMtime = current.lastModifiedDate ? current.lastModifiedDate.getTime() : 0;
              cacheRef.current.set(current.path, { path: thumb, mtime: fileMtime });
              setThumbnails((prev) => ({ ...prev, [current.path]: thumb }));
            }
          } catch {
            // Ignore individual thumbnail generation errors
          }
        }
      }

      const workers = Array.from({ length: Math.min(CONCURRENCY_LIMIT, needed.length) }, () => worker());

      await Promise.all(workers);
    }

    if (files.length > 0) {
      processQueue();
    }

    return () => {
      isCancelled = true;
    };
  }, [files]);

  return thumbnails;
}
