import fs from "fs/promises";
import os from "os";
import path from "path";

export function expandTilde(input: string): string {
  if (!input.startsWith("~")) {
    return input;
  }
  return path.join(os.homedir(), input.slice(1));
}

export async function pathExists(target: string): Promise<boolean> {
  try {
    await fs.access(target);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return false;
    }
    throw error;
  }
}
