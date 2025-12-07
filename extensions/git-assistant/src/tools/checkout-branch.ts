import { exec } from "child_process";
import { Tool } from "@raycast/api";

/**
 * Input for the checkout-branch tool.
 * Contains the repository path and the name of the branch to switch to.
 */
type Input = {
  /**
   * Absolute path to the Git repository where the branch switch should happen.
   */
  path: string;
  /**
   * Name of the target branch to switch to (for example "main" or "feature/login").
   */
  name: string;
};

type CheckoutBranchResult = {
  path: string;
  branch: string;
  previousBranch: string | null;
};

/**
 * Checkout an existing branch in the given repository.
 * Uses `git switch` and reports both the new branch and the previously active branch.
 */
export default async function (input: Input): Promise<CheckoutBranchResult> {
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

    const escapedName = input.name.replace(/'/g, `'\\''`);

    run("git branch --show-current")
      .catch(() => "")
      .then((previous) => {
        const previousBranch = previous.trim() || null;
        const command = `git switch -- '${escapedName}'`;

        return run(command).then(() => {
          resolve({
            path: input.path,
            branch: input.name,
            previousBranch,
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
  });
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  return {
    message: `Switch to branch "${input.name}"?`,
    info: [
      { name: "Target Branch", value: input.name },
      { name: "Repository", value: input.path },
    ],
  };
};
