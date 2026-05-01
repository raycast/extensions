import { promises as fs } from "fs";
import path from "path";

export async function isFlagSet(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function setFlag(filePath: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, "", { flag: "w" });
}

export async function clearFlag(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }
}

export async function toggleFlag(filePath: string): Promise<boolean> {
  if (await isFlagSet(filePath)) {
    await clearFlag(filePath);
    return false;
  }
  await setFlag(filePath);
  return true;
}
