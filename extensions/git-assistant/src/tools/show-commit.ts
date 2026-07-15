import { exec } from "child_process";

/**
 * Input for the show-commit tool.
 * Describes which repository and revision to show.
 */
type Input = {
  /**
   * Absolute path to the Git repository.
   */
  path: string;
  /**
   * Revision identifier to show (commit hash, tag, or branch name).
   */
  revision: string;
};

/**
 * Result of the show-commit tool.
 * Contains the repository path, revision, and raw text output.
 */
type ShowCommitResult = {
  /**
   * Absolute path to the Git repository.
   */
  path: string;
  /**
   * Revision identifier that was shown (commit hash, tag, or branch name).
   */
  revision: string;
  /**
   * Raw text output of the `git show` command.
   */
  output: string;
};

/**
 * Show details and patch for a specific commit using `git show`.
 * Returns the raw text output so the AI can summarize or explain it.
 */
export default async function (input: Input): Promise<ShowCommitResult> {
  return new Promise((resolve, reject) => {
    const escapedRevision = input.revision.replace(/"/g, '\\"');
    const command = `git show "${escapedRevision}"`;

    exec(command, { cwd: input.path }, (error, stdout, stderr) => {
      if (error) {
        reject(stderr.trim() || error.message);
        return;
      }

      resolve({
        path: input.path,
        revision: input.revision,
        output: stdout.trim(),
      });
    });
  });
}
