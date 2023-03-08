import { spawnSync } from "child_process";
import { GitignoreFile } from "./types";
import fs from "fs/promises";

/**
 * Promisified spawn function
 */
export function spawn(command: string, args: ReadonlyArray<string>) {
  return new Promise((resolve, reject) => {
    const process = spawnSync(command, args);
    if (process.error !== undefined) {
      reject(process.error);
    } else {
      resolve(process.stdout.toString());
    }
  });
}

/**
 * Generate contents from a list of GitignoreFile
 */
export async function generateContents(selected: GitignoreFile[], signal?: AbortSignal): Promise<string> {
  try {
    const contents = [];
    for (const gitignore of selected) {
      contents.push(
        `# ---- ${gitignore.name} ----\n${await (await fs.readFile(gitignore.path, { signal })).toString()}`
      );
    }
    return contents.join("\n");
  } catch (err) {
    if (signal?.aborted) {
      return "";
    }
    throw err;
  }
}
