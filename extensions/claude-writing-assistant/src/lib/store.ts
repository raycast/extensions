import { environment } from "@raycast/api";
import { promises as fs } from "node:fs";
import path from "node:path";

/** JSON files in the extension's support directory; writes are atomic and serialized per file. */
export function dataPath(...parts: string[]): string {
  return path.join(environment.supportPath, ...parts);
}

export async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(dataPath(file), "utf8")) as T;
  } catch {
    return fallback;
  }
}

export async function writeJson(file: string, value: unknown): Promise<void> {
  const target = dataPath(file);
  await fs.mkdir(path.dirname(target), { recursive: true });
  const temp = `${target}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(temp, JSON.stringify(value), "utf8");
  await fs.rename(temp, target);
}

const queues = new Map<string, Promise<unknown>>();

/** Read-modify-write without losing concurrent updates from the same process. */
export function updateJson<T>(file: string, fallback: T, update: (value: T) => T): Promise<T> {
  const previous = queues.get(file) ?? Promise.resolve();
  const next = previous
    .catch(() => undefined)
    .then(async () => {
      const value = update(await readJson(file, fallback));
      await writeJson(file, value);
      return value;
    });
  queues.set(file, next);
  return next;
}

export async function removeFile(file: string): Promise<void> {
  await fs.rm(dataPath(file), { force: true, recursive: true });
}
