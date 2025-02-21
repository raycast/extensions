import { exec } from "child_process";

type Input = {
  /**
   * The repository path (required)
   */
  path: string;
  /**
   * Whether to only include staged changes
   * @default false - include all changes (staged, unstaged, and untracked)
   */
  onlyIncludeStagedChanges: boolean;
  /**
   * Maximum number of lines to include in each diff
   * @default 100 - limits each diff to 100 lines
   */
  maxDiffLines?: number;
};

export type GitChanges = {
  path: string;
  changes: {
    unstagedChanges: string;
    stagedChanges: string;
    untrackedFiles: string[];
    untrackedDiff: string;
    status: string;
  };
  summary: {
    hasUnstagedChanges: boolean;
    hasStagedChanges: boolean;
    hasUntrackedFiles: boolean;
    totalFiles: number;
    stats: {
      insertions: number;
      deletions: number;
      filesChanged: number;
    };
  };
};

/**
 * Gets all types of git changes in a repository:
 * - Staged changes
 * - Unstaged changes (if stagedOnly is false)
 * - Untracked files
 *
 * For large changes:
 * - Limits diff output to maxDiffLines (default 100)
 * - Provides statistics about insertions/deletions
 * - Shows total number of files changed
 */
export default async function (input: Input): Promise<GitChanges> {
  const maxLines = input.maxDiffLines || 100;

  return new Promise((resolve, reject) => {
    // Helper function to execute git commands
    const execGit = (command: string): Promise<string> => {
      return new Promise((resolve, reject) => {
        exec(command, { cwd: input.path }, (error, stdout, stderr) => {
          if (error) {
            reject(stderr.trim() || error.message);
          } else {
            resolve(stdout.trim());
          }
        });
      });
    };

    // Helper function to truncate diff output
    const truncateDiff = (diff: string): string => {
      const lines = diff.split("\n");
      if (lines.length <= maxLines) return diff;

      const halfMax = Math.floor(maxLines / 2);
      const firstHalf = lines.slice(0, halfMax);
      const lastHalf = lines.slice(-halfMax);

      return [...firstHalf, `... truncated ${lines.length - maxLines} lines ...`, ...lastHalf].join("\n");
    };

    // Get changes based on mode
    const commands = [
      !input.onlyIncludeStagedChanges ? execGit("git diff") : Promise.resolve(""), // unstaged changes for tracked files
      input.onlyIncludeStagedChanges ? execGit("git diff --staged") : Promise.resolve(""), // staged changes
      !input.onlyIncludeStagedChanges ? execGit("git ls-files --others --exclude-standard") : Promise.resolve(""), // untracked files
      execGit("git status --porcelain"), // status
      !input.onlyIncludeStagedChanges ? execGit("git diff HEAD") : Promise.resolve(""), // all changes including untracked
      execGit("git diff --shortstat HEAD"), // get statistics
    ];

    Promise.all(commands)
      .then(([unstaged, staged, untracked, status, allChanges, stats]) => {
        const untrackedFiles = untracked ? untracked.split("\n").filter(Boolean) : [];
        const statusLines = status.split("\n").filter(Boolean);

        // Parse status to get staged vs unstaged files
        const stagedFiles = statusLines
          .filter((line) => line[0] !== " " && line[0] !== "?")
          .map((line) => line.substring(3));

        // Include both modified and untracked files in unstaged
        const unstagedFiles = statusLines
          .filter((line) => line[1] !== " " || line.startsWith("??"))
          .map((line) => line.substring(3));

        // Parse git diff --shortstat
        const statsMatch = stats.match(
          /(\d+) files? changed(?:, (\d+) insertions?\(\+\))?(?:, (\d+) deletions?\(-\))?/,
        );
        const statsData = {
          filesChanged: parseInt(statsMatch?.[1] || "0"),
          insertions: parseInt(statsMatch?.[2] || "0"),
          deletions: parseInt(statsMatch?.[3] || "0"),
        };

        // Filter and truncate diffs
        const stagedDiff = truncateDiff(staged);
        const unstagedDiff = input.onlyIncludeStagedChanges ? "" : truncateDiff(unstaged);

        if (input.onlyIncludeStagedChanges && stagedFiles.length === 0) {
          reject("No staged changes found in the repository.");
          return;
        }

        if (
          !input.onlyIncludeStagedChanges &&
          stagedFiles.length === 0 &&
          unstagedFiles.length === 0 &&
          untrackedFiles.length === 0
        ) {
          reject("No changes found in the repository.");
          return;
        }

        console.log("Staged files:", stagedFiles);
        console.log("Unstaged files:", unstagedFiles);
        console.log("Untracked files:", untrackedFiles);
        console.log("Status:", status);
        console.log("All changes:", allChanges);
        console.log("Stats:", stats);

        resolve({
          path: input.path,
          changes: {
            unstagedChanges: unstagedDiff,
            stagedChanges: stagedDiff,
            untrackedFiles,
            untrackedDiff: untrackedFiles.join("\n"),
            status,
          },
          summary: {
            hasUnstagedChanges: unstagedFiles.length > 0,
            hasStagedChanges: stagedFiles.length > 0,
            hasUntrackedFiles: untrackedFiles.length > 0,
            totalFiles: stagedFiles.length + unstagedFiles.length + untrackedFiles.length,
            stats: statsData,
          },
        });
      })
      .catch(reject);
  });
}
