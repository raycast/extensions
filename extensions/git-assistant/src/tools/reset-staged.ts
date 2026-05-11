import { exec } from "child_process";
import { Tool } from "@raycast/api";

/**
 * Input for the reset-staged tool.
 * Identifies the repository whose staged changes should be reset.
 */
type Input = {
  /**
   * Absolute path to the Git repository where staged changes should be reset.
   */
  path: string;
};

type ResetStagedResult = {
  path: string;
  message: string;
};

/**
 * Unstage all staged changes in the repository using `git reset`.
 * This keeps the modifications in the working tree but clears the index.
 */
export default async function (input: Input): Promise<ResetStagedResult> {
  return new Promise((resolve, reject) => {
    exec("git reset", { cwd: input.path }, (error, stdout, stderr) => {
      if (error) {
        reject(stderr.trim() || error.message);
        return;
      }

      resolve({
        path: input.path,
        message: stdout.trim() || "All staged changes have been reset.",
      });
    });
  });
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  return {
    message:
      "Unstage ALL staged changes in this repository?\n\n" +
      "This will clear the index but keep your modifications in the working tree.",
    info: [{ name: "Repository", value: input.path }],
  };
};
