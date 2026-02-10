import { useState, useEffect, useRef } from "react";
import { execFile } from "child_process";
import { promisify } from "util";
import Bookmark from "../dtos/bookmark-dto";

const execFileP = promisify(execFile);

export type GitStatus = "clean" | "dirty" | "unknown";
export type GitStatusMap = Record<string, GitStatus>;

export function useBatchGitStatus(bookmarks: Bookmark[]): GitStatusMap {
  const [statusMap, setStatusMap] = useState<GitStatusMap>({});
  const bookmarksRef = useRef(bookmarks);
  bookmarksRef.current = bookmarks;

  useEffect(() => {
    let cancelled = false;

    async function checkAll() {
      const batchSize = 5;
      for (let i = 0; i < bookmarks.length; i += batchSize) {
        if (cancelled) break;
        const batch = bookmarks.slice(i, i + batchSize);
        const results: GitStatusMap = {};

        await Promise.all(
          batch.map(async (bm) => {
            try {
              const { stdout } = await execFileP("git", ["status", "--porcelain", "--untracked-files=no"], {
                cwd: bm.getPath,
                timeout: 3000,
              });
              results[bm.id] = stdout.trim().length > 0 ? "dirty" : "clean";
            } catch {
              results[bm.id] = "unknown";
            }
          }),
        );

        if (!cancelled) {
          setStatusMap((prev) => ({ ...prev, ...results }));
        }
      }
    }

    if (bookmarks.length > 0) {
      checkAll();
    }

    return () => {
      cancelled = true;
    };
  }, [bookmarks]);

  return statusMap;
}
