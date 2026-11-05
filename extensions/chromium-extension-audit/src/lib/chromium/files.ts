import { promises as fs } from "node:fs";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { Dict, object } from "../json";

export function contained(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}
export async function safePath(root: string, target: string): Promise<string> {
  if (!contained(root, path.resolve(target))) throw new Error("Path escapes the validated profile root");
  const real = await fs.realpath(target);
  if (!contained(root, real)) throw new Error("Symbolic link escapes the validated profile root");
  return real;
}
export const missing = (error: unknown) => (error as NodeJS.ErrnoException).code === "ENOENT";
export function readError(error: unknown): string {
  const code = (error as NodeJS.ErrnoException).code;
  if (code === "EACCES" || code === "EPERM") return "macOS denied file access";
  if (code === "ENOENT") return "file is missing";
  if (error instanceof SyntaxError) return "JSON remained invalid after retries";
  return error instanceof Error ? error.message : "file could not be read";
}
export async function readText(root: string, target: string, limit = 32 * 1024 * 1024): Promise<string> {
  const file = await safePath(root, target);
  const handle = await fs.open(file, "r");
  try {
    const before = await handle.stat();
    if (!before.isFile() || before.size > limit) throw new Error("File is not regular or exceeds the read limit");
    const text = await handle.readFile("utf8");
    const after = await handle.stat();
    if (before.mtimeMs !== after.mtimeMs || before.size !== after.size) throw new Error("File changed during the read");
    return text;
  } finally {
    await handle.close();
  }
}
export async function readJson(root: string, target: string): Promise<{ data: Dict; raw: string }> {
  for (let attempt = 0; ; attempt++) {
    try {
      const raw = await readText(root, target);
      const data = object(JSON.parse(raw));
      if (!data) throw new SyntaxError("Expected a JSON object");
      return { raw, data };
    } catch (error) {
      if (
        attempt >= 2 ||
        (!(error instanceof SyntaxError) &&
          !(error instanceof Error && error.message === "File changed during the read"))
      )
        throw error;
      await delay(40 * 2 ** attempt);
    }
  }
}
