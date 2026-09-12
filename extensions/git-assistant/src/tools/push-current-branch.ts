import { exec } from "child_process";
import { Tool } from "@raycast/api";

/**
 * Input for the push-current-branch tool.
 * Controls how the current branch is pushed to a remote.
 */
type Input = {
  /**
   * Absolute path to the Git repository whose current branch should be pushed.
   */
  path: string;
  /**
   * Optional remote name to push to (defaults to "origin").
   */
  remote?: string;
  /**
   * When true (default), sets the upstream if none exists yet using `git push -u`.
   */
  setUpstreamIfNeeded?: boolean;
};

type PushCurrentBranchResult = {
  path: string;
  branch: string;
  remote: string;
  output: string;
};

/**
 * Push the current branch to a remote using `git push`.
 * Optionally sets the upstream if it is not configured yet.
 */
export default async function (input: Input): Promise<PushCurrentBranchResult> {
  return new Promise((resolve, reject) => {
    const run = (command: string): Promise<string> => {
      return new Promise((resolveCommand, rejectCommand) => {
        exec(command, { cwd: input.path }, (error, stdout, stderr) => {
          if (error) {
            rejectCommand(stderr.trim() || error.message);
          } else {
            resolveCommand(stdout.trim());
          }
        });
      });
    };

    const remote = input.remote?.trim() || "origin";
    const setUpstreamIfNeeded = input.setUpstreamIfNeeded !== false;

    run("git branch --show-current")
      .then((current) => {
        const branch = current.trim();
        if (!branch) {
          reject("Could not determine current branch.");
          return;
        }

        const checkUpstream = setUpstreamIfNeeded
          ? run("git rev-parse --abbrev-ref --symbolic-full-name @{u}").then(
              () => true,
              () => false,
            )
          : Promise.resolve(true);

        return checkUpstream
          .then((hasUpstream) => {
            const escapedBranch = branch.replace(/"/g, '\\"');
            const escapedRemote = remote.replace(/"/g, '\\"');

            const command = hasUpstream
              ? `git push "${escapedRemote}" "${escapedBranch}"`
              : `git push -u "${escapedRemote}" "${escapedBranch}"`;

            return run(command).then((output) => {
              resolve({
                path: input.path,
                branch,
                remote,
                output,
              });
            });
          })
          .catch((error) => {
            if (typeof error === "string") {
              reject(error);
            } else {
              reject(String(error));
            }
          });
      })
      .catch((error) => {
        if (typeof error === "string") {
          reject(error);
        } else {
          reject(String(error));
        }
      });
  });
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const remote = input.remote?.trim() || "origin";

  return {
    message: `Push the current branch to remote "${remote}"? This uses a normal push without force.`,
    info: [
      { name: "Remote", value: remote },
      { name: "Repository", value: input.path },
    ],
  };
};
