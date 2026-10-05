import { constants } from "node:fs";
import { access, chmod, lstat } from "node:fs/promises";

export async function ensureExecutable(filePath: string): Promise<void> {
  const stats = await lstat(filePath);

  if (!stats.isFile() || stats.isSymbolicLink()) {
    throw new Error(`Bundled fp-progress helper is not a regular file: ${filePath}`);
  }

  try {
    await access(filePath, constants.X_OK);
    return;
  } catch {
    await chmod(filePath, stats.mode | 0o111);
  }

  await access(filePath, constants.X_OK);
}
