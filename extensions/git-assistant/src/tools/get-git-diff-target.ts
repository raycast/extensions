import { exec } from "child_process";

/**
 * Input for the get-git-diff-target tool.
 * Describes which repository and target revision to compare against.
 */
type Input = {
  /**
   * Absolute path to the Git repository.
   */
  path: string;
  /**
   * Target branch or revision to compare the current state against (for example "main" or a commit hash).
   */
  target: string;
  /**
   * Optional number of context lines for the unified diff (defaults to 3).
   */
  contextLines?: number;
};

/**
 * Result of the get-git-diff-target tool.
 * Contains the diff between the current working tree and a target branch or revision.
 */
type GitDiffResult = {
  /**
   * Absolute path to the Git repository.
   */
  path: string;
  /**
   * Target branch or revision that was compared against.
   */
  target: string;
  /**
   * Number of context lines for the unified diff.
   */
  contextLines: number;
  /**
   * The diff between the current working tree and the target branch or revision.
   */
  diff: string;
};

/**
 * Show the diff between the current working tree and a target branch or revision using `git diff`.
 *
 * @param input - Input for the get-git-diff-target tool.
 * @returns A promise that resolves with the diff between the current working tree and the target branch or revision.
 */
export default async function (input: Input): Promise<GitDiffResult> {
  const contextLines = input.contextLines && input.contextLines > 0 ? input.contextLines : 3;

  return new Promise((resolve, reject) => {
    const escapedTarget = input.target.replace(/"/g, '\\"');
    const command = `git diff --unified=${contextLines} "${escapedTarget}"`;

    exec(command, { cwd: input.path }, (error, stdout, stderr) => {
      if (error) {
        reject(stderr.trim() || error.message);
        return;
      }

      resolve({
        path: input.path,
        target: input.target,
        contextLines,
        diff: stdout.trim(),
      });
    });
  });
}
