import { readFile, access } from "node:fs/promises";

/**
 * Reads the last N lines of a log file.
 */
export async function readLogTail(
  logPath: string,
  lines: number = 50,
): Promise<string | null> {
  try {
    await access(logPath);

    const content = await readFile(logPath, "utf-8");

    if (!content) {
      return "";
    }

    const allLines = content.split("\n");
    const tail = allLines.slice(-lines).join("\n");
    return tail;
  } catch {
    return null;
  }
}
