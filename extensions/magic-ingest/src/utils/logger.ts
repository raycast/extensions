import { appendFile, stat, readFile, writeFile } from "fs/promises";
import { LOG_FILE, MAX_LOG_SIZE } from "./constants";

async function rotateIfNeeded(): Promise<void> {
  try {
    const stats = await stat(LOG_FILE);
    if (stats.size > MAX_LOG_SIZE) {
      const content = await readFile(LOG_FILE, "utf-8");
      const half = Math.floor(content.length / 2);
      const newlineAfterHalf = content.indexOf("\n", half);
      const trimmed =
        newlineAfterHalf !== -1
          ? content.slice(newlineAfterHalf + 1)
          : content.slice(half);
      await writeFile(LOG_FILE, trimmed, "utf-8");
    }
  } catch {
    // File doesn't exist yet — that's fine
  }
}

export async function logLine(message: string): Promise<void> {
  const timestamp = new Date().toISOString();
  await appendFile(LOG_FILE, `${timestamp}  ${message}\n`, "utf-8");
}

export async function logSessionStart(
  cards: string[],
  destination: string,
): Promise<void> {
  await rotateIfNeeded();
  const divider = "=".repeat(60);
  await logLine(divider);
  await logLine(`INGEST SESSION START`);
  await logLine(`Source cards: ${cards.join(", ")}`);
  await logLine(`Destination: ${destination}`);
  await logLine(divider);
}

export async function logSessionEnd(stats: {
  copied: number;
  skipped: number;
  collisions: number;
  verified: number;
  verifyFailed: number;
  renamed: number;
  errors: string[];
  durationMs: number;
}): Promise<void> {
  await logLine(`--- SESSION SUMMARY ---`);
  await logLine(`Files copied: ${stats.copied}`);
  await logLine(`Skipped (duplicate): ${stats.skipped}`);
  await logLine(`Filename collisions resolved: ${stats.collisions}`);
  await logLine(`Verified: ${stats.verified}, Failed: ${stats.verifyFailed}`);
  await logLine(`Renamed: ${stats.renamed}`);
  await logLine(`Duration: ${(stats.durationMs / 1000).toFixed(1)}s`);
  if (stats.errors.length > 0) {
    await logLine(`Errors:`);
    for (const err of stats.errors) {
      await logLine(`  - ${err}`);
    }
  }
  await logLine(`--- END ---\n`);
}
