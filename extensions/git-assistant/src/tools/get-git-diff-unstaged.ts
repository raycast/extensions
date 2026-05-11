import { exec } from "child_process";

/**
 * Input for the get-git-diff-unstaged tool.
 * Controls how the unstaged diff is produced for a repository.
 */
type Input = {
  /**
   * Absolute path to the Git repository.
   */
  path: string;
  /**
   * Optional number of context lines for the unified diff (defaults to 3).
   */
  contextLines?: number;
};

type GitDiffResult = {
  path: string;
  contextLines: number;
  diff: string;
};

/**
 * Show the unstaged diff for the working directory using `git diff`.
 * The diff is returned as raw text along with the context lines used.
 */
export default async function (input: Input): Promise<GitDiffResult> {
  const contextLines = input.contextLines && input.contextLines > 0 ? input.contextLines : 3;

  return new Promise((resolve, reject) => {
    const command = `git diff --unified=${contextLines}`;

    exec(command, { cwd: input.path }, (error, stdout, stderr) => {
      if (error) {
        reject(stderr.trim() || error.message);
        return;
      }

      resolve({
        path: input.path,
        contextLines,
        diff: stdout.trim(),
      });
    });
  });
}
