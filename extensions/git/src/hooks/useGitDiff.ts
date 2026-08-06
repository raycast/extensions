import { usePromise } from "@raycast/utils";
import { GitManager } from "../utils/git-manager";
import { FileStatus } from "../types";
import { join } from "path";
import { fileTypeFromBuffer } from "file-type";
import { existsSync, openSync, readSync, closeSync } from "fs";

interface UseGitDiffProps {
  gitManager: GitManager;
  options: { file: string; commitHash?: string; status?: FileStatus["status"] };
  execute?: boolean;
}

const MAX_DIFF_LINES = 200;

/** Bytes needed for `file-type` magic-number detection (`reasonableDetectionSizeInBytes`). */
const FILE_TYPE_SAMPLE_SIZE = 4100;

/**
 * Reads the start of a file for binary/MIME detection without loading the whole file.
 * Prefer this over `fileTypeFromFile`: that API dynamically imports `strtok3` at runtime,
 * which fails in Raycast's bundled extension (no `node_modules` next to the command).
 */
function readFileHead(filePath: string, size: number): Uint8Array {
  const fd = openSync(filePath, "r");
  try {
    const buffer = Buffer.alloc(size);
    const bytesRead = readSync(fd, buffer, 0, size, 0);
    return buffer.subarray(0, bytesRead);
  } finally {
    closeSync(fd);
  }
}

/**
 * Hook for fetching the diff for a file or commit with smart caching.
 * - Commit diffs are cached long-term (commits are immutable)
 * - File diffs are cached short-term with revalidation
 */
export function useGitDiff({ gitManager, options, execute = true }: UseGitDiffProps) {
  const { file, commitHash, status } = options;

  const { data, isLoading, error, revalidate } = usePromise(
    async (file, commitHash, status, repoPath) => {
      const absolutePath = join(repoPath, file);

      if (existsSync(absolutePath)) {
        const binaryFormatInfo = await fileTypeFromBuffer(readFileHead(absolutePath, FILE_TYPE_SAMPLE_SIZE));

        if (binaryFormatInfo) {
          if (binaryFormatInfo.mime.startsWith("image/")) {
            return `![$(${file})](${absolutePath})`;
          } else {
            return "<binary content>";
          }
        }
      }

      const rawDiff = await gitManager.getDiff({ file, commitHash, status });

      if (rawDiff) {
        const lines = rawDiff.split("\n");
        if (lines.length > MAX_DIFF_LINES) {
          return [
            "```text",
            "⚠️ Diff is too large to display (more than 200 lines).",
            "Open this file in external editor to view the full diff.",
            "```",
          ].join("\n");
        }
        return `~~~diff\n${rawDiff}\n~~~`;
      }

      return undefined;
    },
    [file, commitHash, status, gitManager.repoPath],
    {
      execute,
    },
  );

  return {
    diff: data,
    isLoading,
    error,
    revalidate,
  };
}
