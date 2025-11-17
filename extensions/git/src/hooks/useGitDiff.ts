import { usePromise } from "@raycast/utils";
import { GitManager } from "../utils/git-manager";
import { FileStatus } from "../types";
import { join } from "path";
import { fileTypeFromFile } from "file-type";
import { existsSync } from "fs";

interface UseGitDiffProps {
  gitManager: GitManager;
  options: { file: string; commitHash?: string; status?: FileStatus["status"] };
  execute?: boolean;
}

const MAX_DIFF_LINES = 200;

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
        const binaryFormatInfo = await fileTypeFromFile(absolutePath);

        if (binaryFormatInfo) {
          if (binaryFormatInfo.mime.startsWith("image/")) {
            return `![$(${file})](${absolutePath})`;
          } else {
            return "<binary content>";
          }
        }
      }

      let rawDiff = await gitManager.getDiff({ file, commitHash, status });

      // Remove leading whitespace from diff lines
      rawDiff = rawDiff.replace(/^\s+([+-])/gm, "$1 ");

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
