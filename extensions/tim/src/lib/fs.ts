import { PathLike } from "fs";
import { stat } from "fs/promises";

/**
 * Check if a file exists
 * @param path
 */
export async function existsFile(path: PathLike): Promise<boolean> {
  try {
    const fileStatus = await stat(path);
    return fileStatus.isFile();
  } catch (error) {
    return false;
  }
}
