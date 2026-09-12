import { exec } from "child_process";
import { Tool } from "@raycast/api";

/**
 * Input for the create-branch tool.
 * Describes where to create the branch and what it should be called.
 */
type Input = {
  /**
   * Absolute path to the Git repository where the branch should be created.
   */
  path: string;
  /**
   * Name of the new branch to create (for example "feature/login").
   */
  name: string;
  /**
   * Optional base branch to create from. If omitted, the current branch is used as the base.
   */
  baseBranch?: string;
};

type CreateBranchResult = {
  path: string;
  branch: string;
  previousBranch: string | null;
};

/**
 * Create a new branch in the given repository and switch to it.
 * Optionally uses a specific base branch; otherwise uses the current branch.
 */
export default async function (input: Input): Promise<CreateBranchResult> {
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

    const escapedName = input.name.replace(/"/g, '\\"');
    const escapedBase = input.baseBranch ? input.baseBranch.replace(/"/g, '\\"') : null;

    run("git branch --show-current")
      .catch(() => "")
      .then((previous) => {
        const previousBranch = previous.trim() || null;
        const command = escapedBase
          ? `git switch -c "${escapedName}" "${escapedBase}"`
          : `git switch -c "${escapedName}"`;

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
  const info: { name: string; value: string }[] = [
    { name: "New Branch", value: input.name },
    { name: "Repository", value: input.path },
  ];

  if (input.baseBranch) {
    info.splice(1, 0, { name: "Base Branch", value: input.baseBranch });
  }

  return {
    message: `Create and switch to branch "${input.name}"?`,
    info,
  };
};
