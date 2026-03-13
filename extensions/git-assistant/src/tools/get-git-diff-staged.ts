import { exec } from "child_process";

/**
 * Input for the get-git-diff-staged tool.
 * Controls how the staged diff is produced for a repository.
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

/**
 * Result of the get-git-diff-staged tool.
 * Contains the path to the repository, the number of context lines used, and the raw diff text.
 */
type GitDiffResult = {
  /**
   * Absolute path to the Git repository.
   */
  path: string;
  /**
   * Number of context lines used for the unified diff.
   */
  contextLines: number;
  /**
   * Raw text of the staged diff.
   */
  diff: string;
};

/**
 * Show the staged diff for the working directory using `git diff --cached`.
 * The diff is returned as raw text along with the context lines used.
 *
 * @param input - Input for the get-git-diff-staged tool.
 * @returns A promise that resolves with the result of the get-git-diff-staged tool.
 */
export default async function (input: Input): Promise<GitDiffResult> {
  const contextLines = input.contextLines && input.contextLines > 0 ? input.contextLines : 3;

  return new Promise((resolve, reject) => {
    const command = `git diff --cached --unified=${contextLines}`;

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
