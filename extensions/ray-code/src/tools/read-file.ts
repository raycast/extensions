import { readFile } from "node:fs/promises";
import { resolveAndValidatePath } from "../utils/workspace";

type Input = {
  /**
   * The relative path to the file from the workspace root
   */
  path: string;
};

export default async function ({ path }: Input) {
  const filePath = resolveAndValidatePath(path);
  const content = await readFile(filePath, "utf8");

  return content;
}
