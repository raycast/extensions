import { exec } from "child_process";
import { Tool } from "@raycast/api";

type Input = {
  /**
   * The git command to execute
   */
  command: string;
  /**
   * The repository path (required)
   */
  path: string;
  /**
   * Whether the path is a git repository (required)
   */
  isGitRepo: boolean;
};

/**
 * Executes a git command in the specified repository.
 * Requires path and isGitRepo to be provided from get-current-directory tool first.
 */
export default async function (input: Input) {
  return new Promise((resolve, reject) => {
    if (!input.isGitRepo) {
      reject(`Directory ${input.path} is not a git repository`);
      return;
    }

    // Execute the git command
    exec(input.command, { cwd: input.path }, (error, stdout, stderr) => {
      if (error) {
        reject(`Git command failed: ${stderr}`);
        return;
      }
      resolve({
        output: stdout.trim(),
        command: input.command,
        path: input.path,
      });
    });
  });
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  return {
    message: "Allow this git command to run?\n```bash\n" + input.command + "\n```",
    info: [
      { name: "Command", value: input.command },
      { name: "Repository", value: input.path },
    ],
  };
};
