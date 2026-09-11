import { exec } from "child_process";
import { Tool } from "@raycast/api";

/**
 * Input for the stage-files tool.
 * Specifies which files to add to the Git index.
 */
type Input = {
  /**
   * Absolute path to the Git repository where files should be staged.
   */
  path: string;
  /**
   * One or more repo-root relative file paths to stage (for example "src/index.ts").
   * Multiple files should be separated by newlines or commas and will be split into a list.
   */
  files: string;
};

/**
 * Result of staging files in the repository.
 */
type StageFilesResult = {
  /**
   * Absolute path to the Git repository where files were staged.
   */
  path: string;
  /**
   * List of files that were successfully staged.
   */
  stagedFiles: string[];
};

/**
 * Stage specific files in the repository using `git add`.
 * Expects file paths to be relative to the repository root.
 */
export default async function (input: Input): Promise<StageFilesResult> {
  return new Promise((resolve, reject) => {
    const files = input.files
      .split(/[\n,]/)
      .map((file) => file.trim())
      .filter((file) => file.length > 0);

    if (files.length === 0) {
      reject("No files provided to stage.");
      return;
    }

    const quoted = files.map((file) => `"${file.replace(/"/g, '\\"')}"`).join(" ");
    const command = `git add ${quoted}`;

    exec(command, { cwd: input.path }, (error, stdout, stderr) => {
      if (error) {
        reject(stderr.trim() || error.message);
        return;
      }

      resolve({
        path: input.path,
        stagedFiles: files,
      });
    });
  });
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const files = input.files
    .split(/[\n,]/)
    .map((file) => file.trim())
    .filter((file) => file.length > 0);

  const filesList = files.map((file) => `- ${file}`).join("\n");

  return {
    message: `Stage the following files?\n${filesList}`,
    info: [
      { name: "Repository", value: input.path },
      { name: "File Count", value: String(files.length) },
    ],
  };
};
