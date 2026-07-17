import { readdir } from "node:fs/promises";
import { resolveAndValidatePath } from "../utils/workspace";

type Input = {
  /**
   * The relative path to the directory from the workspace root
   */
  path: string;
};

export default async function ({ path }: Input) {
  const dirPath = resolveAndValidatePath(path);
  const files = await readdir(dirPath);

  return files;
}
