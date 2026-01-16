import fs from "node:fs/promises";

const dirExists = new Map<string, boolean>();

export async function ensureDirExists(dir: string): Promise<void> {
  if (dirExists.has(dir)) return;

  const isExists = await pathExists(dir);
  if (isExists) {
    dirExists.set(dir, true);
    return;
  }

  await fs.mkdir(dir, { recursive: true });
  dirExists.set(dir, true);
}

export async function pathExists(path: string): Promise<boolean> {
  try {
    await fs.access(path, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}
