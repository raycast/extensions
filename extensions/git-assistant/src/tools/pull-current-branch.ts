import { exec } from "child_process";
import { Tool } from "@raycast/api";

/**
 * Input for the pull-current-branch tool.
 * Controls how the latest changes are pulled for the current branch.
 */
type Input = {
  /**
   * Absolute path to the Git repository whose current branch should be updated.
   */
  path: string;
  /**
   * When true (default), use `git pull --ff-only` to avoid merge commits.
   */
  ffOnly?: boolean;
};

/**
 * Result of the pull-current-branch tool.
 * Contains the path of the updated repository and the output of the `git pull` command.
 */
type PullCurrentBranchResult = {
  /**
   * Absolute path to the Git repository that was updated.
   */
  path: string;
  /**
   * Output of the `git pull` command.
   */
  output: string;
};

/**
 * Pull the latest changes for the current branch using `git pull`.
 * Uses fast-forward only mode by default.
 */
export default async function (input: Input): Promise<PullCurrentBranchResult> {
  return new Promise((resolve, reject) => {
    const ffOnly = input.ffOnly !== false;
    const command = ffOnly ? "git pull --ff-only" : "git pull";

    exec(command, { cwd: input.path }, (error, stdout, stderr) => {
      if (error) {
        reject(stderr.trim() || error.message);
        return;
      }

      resolve({
        path: input.path,
        output: stdout.trim(),
      });
    });
  });
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const ffOnly = input.ffOnly !== false;
  const strategy = ffOnly ? "fast-forward only (git pull --ff-only)" : "default git pull";

  return {
    message: `Pull the latest changes for the current branch using ${strategy}?`,
    info: [{ name: "Repository", value: input.path }],
  };
};
