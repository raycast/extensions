import { exec } from "child_process";
import { Tool } from "@raycast/api";

/**
 * Input for the unstage-files tool.
 * Specifies which files to remove from the Git index while keeping their changes.
 */
type Input = {
  /**
   * Absolute path to the Git repository where files should be unstaged.
   */
  path: string;
  /**
   * One or more repo-root relative file paths to unstage.
   * Multiple files should be separated by newlines or commas and will be split into a list.
   */
  files: string;
};

type UnstageFilesResult = {
  path: string;
  unstagedFiles: string[];
};

/**
 * Unstage specific files in the repository using `git restore --staged`.
 * This keeps the file changes in the working tree but removes them from the index.
 */
export default async function (input: Input): Promise<UnstageFilesResult> {
  return new Promise((resolve, reject) => {
    const files = input.files
      .split(/[\n,]/)
      .map((file) => file.trim())
      .filter((file) => file.length > 0);

    if (files.length === 0) {
      reject("No files provided to unstage.");
      return;
    }

    const quoted = files.map((file) => `"${file.replace(/"/g, '\\"')}"`).join(" ");
    const command = `git restore --staged ${quoted}`;

    exec(command, { cwd: input.path }, (error, stdout, stderr) => {
      if (error) {
        reject(stderr.trim() || error.message);
        return;
      }

      resolve({
        path: input.path,
        unstagedFiles: files,
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
    message: `Unstage the following files?\n${filesList}`,
    info: [
      { name: "Repository", value: input.path },
      { name: "File Count", value: String(files.length) },
    ],
  };
};
