import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

export async function localImageTurnInput(imagePath: string): Promise<{ type: "localImage"; path: string }> {
  const localPath = imagePath.startsWith("file://") ? fileURLToPath(imagePath) : path.resolve(imagePath);
  if (!(await fs.stat(localPath)).isFile()) throw new Error(`Image path is not a file: ${localPath}`);
  return { type: "localImage", path: localPath };
}
