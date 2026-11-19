import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export async function saveTemporaryImage(sourcePath: string): Promise<string> {
  const directory = path.join(os.homedir(), "Pictures", "Inspiration Images");
  await fs.mkdir(directory, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const suffix = Math.random().toString(36).slice(2, 7);
  const imagePath = path.join(directory, `inspiration-${stamp}-${suffix}.png`);
  await fs.copyFile(sourcePath, imagePath, fs.constants.COPYFILE_EXCL);
  return imagePath;
}
