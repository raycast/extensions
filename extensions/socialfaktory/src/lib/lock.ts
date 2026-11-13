import { randomUUID } from "node:crypto";
import { mkdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

export const LOCK_STALE_MS = 30_000;
const LOCK_WAIT_MS = 50;

type Clock = {
  now(): number;
  sleep(ms: number): Promise<void>;
};

export function fileLock(directory: string, clock: Clock) {
  return async <T>(name: string, work: () => Promise<T>): Promise<T> => {
    await mkdir(directory, { recursive: true });
    const path = join(directory, `${name}.lock`);
    const owner = randomUUID();
    while (!(await create(path, owner))) {
      await breakIfStale(path, clock.now());
      await clock.sleep(LOCK_WAIT_MS);
    }
    try {
      return await work();
    } finally {
      await release(path, owner);
    }
  };
}

async function create(path: string, owner: string): Promise<boolean> {
  try {
    await writeFile(path, owner, { flag: "wx" });
    return true;
  } catch (error) {
    if (codeOf(error) === "EEXIST") return false;
    throw error;
  }
}

async function breakIfStale(path: string, now: number): Promise<void> {
  if (!(await stale(path, now))) return;
  const breaker = `${path}.break`;
  if (!(await create(breaker, ""))) {
    if (await stale(breaker, now)) await remove(breaker);
    return;
  }
  try {
    if (await stale(path, now)) await remove(path);
  } finally {
    await remove(breaker);
  }
}

async function stale(path: string, now: number): Promise<boolean> {
  try {
    return now - (await stat(path)).mtimeMs >= LOCK_STALE_MS;
  } catch (error) {
    if (codeOf(error) === "ENOENT") return false;
    throw error;
  }
}

async function remove(path: string): Promise<void> {
  try {
    await unlink(path);
  } catch (error) {
    if (codeOf(error) !== "ENOENT") throw error;
  }
}

async function release(path: string, owner: string): Promise<void> {
  try {
    if ((await readFile(path, "utf8")) === owner) await remove(path);
  } catch (error) {
    if (codeOf(error) !== "ENOENT") throw error;
  }
}

function codeOf(error: unknown): unknown {
  return (error as { code?: unknown } | undefined)?.code;
}
