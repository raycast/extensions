import { environment } from "@raycast/api";
import { appendFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const LOG_FILE_NAME = "standing-desk.log";
const MAX_LOG_SIZE_BYTES = 256 * 1024;
const RETAINED_LOG_SIZE_BYTES = 128 * 1024;

export type DiagnosticLevel = "info" | "warning" | "error";

export function getDiagnosticLogPath(): string {
  return path.join(environment.supportPath, LOG_FILE_NAME);
}

export function sanitizeDiagnosticText(value: string): string {
  return value
    .replaceAll(environment.supportPath, "[support-path]")
    .replace(
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi,
      "[desk-identifier]",
    );
}

export async function logDiagnostic(
  level: DiagnosticLevel,
  operation: string,
  details: Record<string, unknown> = {},
): Promise<void> {
  try {
    await mkdir(environment.supportPath, { recursive: true });
    const logPath = getDiagnosticLogPath();
    await trimLogIfNeeded(logPath);
    const entry = sanitizeDiagnosticText(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level,
        operation,
        ...details,
      }),
    );
    await appendFile(logPath, `${entry}\n`, "utf8");
  } catch {
    // Diagnostics must never prevent desk control or recovery actions.
  }
}

export async function ensureDiagnosticLog(): Promise<string> {
  const logPath = getDiagnosticLogPath();
  await mkdir(environment.supportPath, { recursive: true });
  try {
    await stat(logPath);
  } catch {
    await writeFile(logPath, "", "utf8");
  }
  return logPath;
}

async function trimLogIfNeeded(logPath: string): Promise<void> {
  let size: number;
  try {
    size = (await stat(logPath)).size;
  } catch {
    return;
  }
  if (size <= MAX_LOG_SIZE_BYTES) return;

  const contents = await readFile(logPath, "utf8");
  const retained = contents.slice(-RETAINED_LOG_SIZE_BYTES);
  const firstNewline = retained.indexOf("\n");
  await writeFile(
    logPath,
    firstNewline === -1 ? retained : retained.slice(firstNewline + 1),
    "utf8",
  );
}
