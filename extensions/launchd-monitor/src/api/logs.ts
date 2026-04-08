import { stat } from "fs/promises";
import { exec } from "../utils/exec";

export async function getLogLastModified(
  logPath: string,
): Promise<Date | null> {
  try {
    const s = await stat(logPath);
    return s.mtime;
  } catch {
    return null;
  }
}

export async function getLogTail(
  logPath: string,
  lines = 50,
): Promise<string | null> {
  try {
    const output = await exec("/usr/bin/tail", ["-n", String(lines), logPath]);
    return output;
  } catch {
    return null;
  }
}
