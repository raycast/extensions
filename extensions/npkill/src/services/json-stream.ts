import { isAbsolute } from "node:path";
import { ScanRecord } from "../types";

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function parseRecord(line: string): ScanRecord {
  let value: unknown;
  try {
    value = JSON.parse(line);
  } catch {
    throw new Error(`Incompatible npkill output: ${line.slice(0, 300)}`);
  }
  if (!object(value) || value.version !== 1)
    throw new Error("Unsupported npkill output schema. Use a compatible npkill 1.x release.");
  const result = value.result;
  if (!object(result) || typeof result.path !== "string" || !isAbsolute(result.path) || result.path.includes("\0"))
    throw new Error("Invalid directory in npkill output.");
  const size = result.size;
  if (size !== null && (typeof size !== "number" || !Number.isFinite(size) || size < 0))
    throw new Error("Invalid size in npkill output.");
  // Do not substitute directory modificationTime for project activity.
  const activity = result.projectModificationTime;
  if (
    activity !== null &&
    (typeof activity !== "number" || !Number.isFinite(activity) || activity <= 1 || activity > 8.64e15)
  )
    throw new Error("Invalid project activity in npkill output.");
  const risk = result.riskAnalysis;
  if (
    risk !== undefined &&
    risk !== null &&
    (!object(risk) ||
      typeof risk.isSensitive !== "boolean" ||
      (risk.reason !== undefined && typeof risk.reason !== "string"))
  )
    throw new Error("Invalid risk analysis in npkill output.");
  if (result.deletion !== undefined) throw new Error("Unexpected deletion metadata in a read-only scan.");
  return {
    path: result.path,
    size: size as number | null,
    activity: activity as number | null,
    risk: object(risk) ? (risk.isSensitive ? "sensitive" : "review") : "unknown",
    reason: object(risk) ? (risk.reason as string | undefined) : undefined,
  };
}

export function parseStderr(line: string): string {
  try {
    const value: unknown = JSON.parse(line);
    if (object(value) && value.version === 1 && value.error === true && typeof value.message === "string")
      return value.message;
  } catch {
    /* Runtime and configuration errors can be plain text. */
  }
  // Strip terminal color sequences from plain-text startup/configuration errors.
  // eslint-disable-next-line no-control-regex
  return line.replace(/\x1b\[[0-9;]*m/g, "").slice(0, 2000);
}

export class LineBuffer {
  private buffer = "";
  constructor(private readonly consume: (line: string) => void) {}
  write(chunk: string): void {
    this.buffer += chunk;
    let end: number;
    while ((end = this.buffer.indexOf("\n")) >= 0) {
      const line = this.buffer.slice(0, end).trim();
      this.buffer = this.buffer.slice(end + 1);
      if (line.length > 1024 * 1024) throw new Error("npkill output record is too large.");
      if (line) this.consume(line);
    }
    if (this.buffer.length > 1024 * 1024) throw new Error("npkill output record is too large.");
  }
  end(): void {
    if (this.buffer.trim()) this.consume(this.buffer.trim());
    this.buffer = "";
  }
}
