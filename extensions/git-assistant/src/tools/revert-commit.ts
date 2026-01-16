import { exec } from "child_process";
import { Tool } from "@raycast/api";

/**
 * Input for the revert-commit tool.
 * Describes which repository and commit should be reverted.
 */
type Input = {
  /**
   * Absolute path to the Git repository.
   */
  path: string;
  /**
   * Revision identifier to revert (typically a commit hash).
   */
  revision: string;
  /**
   * When true, use `git revert --no-commit` to apply the revert without
   * automatically creating a commit, leaving changes staged instead.
   */
  noCommit?: boolean;
};

type RevertCommitResult = {
  path: string;
  revision: string;
  output: string;
};

/**
 * Revert a specific commit using `git revert`.
 * Can either create a revert commit immediately or apply the revert without committing.
 */
export default async function (input: Input): Promise<RevertCommitResult> {
  return new Promise((resolve, reject) => {
    const escapedRevision = input.revision.replace(/"/g, '\\"');
    const command = input.noCommit ? `git revert --no-commit "${escapedRevision}"` : `git revert "${escapedRevision}"`;

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

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const mode = input.noCommit ? "without creating a commit (changes will be staged)" : "and create a revert commit";

  return {
    message:
      `Revert commit "${input.revision}" ${mode}?\n\n` +
      "This may conflict with local changes if the history has diverged.",
    info: [{ name: "Repository", value: input.path }],
  };
};
