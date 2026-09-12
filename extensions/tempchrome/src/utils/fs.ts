import * as fs from "node:fs";

export async function removePath(targetPath: string): Promise<void> {
  await fs.promises.rm(targetPath, { recursive: true, force: true });
}
