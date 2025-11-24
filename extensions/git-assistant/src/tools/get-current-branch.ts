import { exec } from "child_process";

/**
 * Input for the get-current-branch tool.
 * Identifies the repository whose current branch name should be returned.
 */
type Input = {
  /**
   * Absolute path to the Git repository.
   */
  path: string;
};

type GetCurrentBranchResult = {
  /**
   * Absolute path to the Git repository.
   */
  path: string;
  /**
   * Current branch name, or null if it cannot be determined (for example, in a detached HEAD state).
   */
  branch: string | null;
};

/**
 * Return the current branch name for a repository using `git rev-parse --abbrev-ref HEAD`.
 */
export default async function (input: Input): Promise<GetCurrentBranchResult> {
  return new Promise((resolve, reject) => {
    exec("git rev-parse --abbrev-ref HEAD", { cwd: input.path }, (error, stdout, stderr) => {
      if (error) {
        reject(stderr.trim() || error.message);
        return;
      }

      const branch = stdout.trim() || null;
      resolve({
        path: input.path,
        branch,
      });
    });
  });
}
