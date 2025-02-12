import { constants } from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";

export async function fileExists(filename: string): Promise<boolean> {
  try {
    const stat = await fs.stat(filename);
    return Boolean(stat);
  } catch {
    return false;
  }
}

export function isSubdirectory(parent: string, child: string): boolean {
  const relative = path.relative(parent, child);
  return !relative.startsWith("..") && !path.isAbsolute(relative);
}

export async function isReadWrite(filename: string): Promise<boolean> {
  try {
    await fs.access(filename, constants.R_OK | constants.W_OK);
    return true;
  } catch {
    return false;
  }
}
