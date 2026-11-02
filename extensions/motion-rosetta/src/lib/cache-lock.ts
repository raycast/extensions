import { randomUUID } from "node:crypto";
import {
  mkdir,
  readdir,
  readFile,
  writeFile,
  rename,
  rmdir,
  unlink,
  stat,
} from "node:fs/promises";
import { join } from "node:path";

const CLAIM = /^([1-9]\d*)-[a-f0-9-]{36}$/;
const missing = (error: unknown) =>
  (error as NodeJS.ErrnoException).code === "ENOENT";

// Never steal from a paused process, an inaccessible PID, or a reused live PID.
function dead(pid: number) {
  try {
    process.kill(pid, 0);
    return false;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "ESRCH";
  }
}

async function retire(root: string, name: string) {
  const released = join(root, `.released-${name}`);
  try {
    await rename(join(root, name), released);
  } catch (error) {
    if (missing(error)) return;
    throw error;
  }
  for (const file of ["ticket", "pending"]) {
    try {
      await unlink(join(released, file));
    } catch (error) {
      if (!missing(error)) throw error;
    }
  }
  await rmdir(released);
}

async function ticket(root: string, name: string): Promise<bigint | undefined> {
  const match = CLAIM.exec(name);
  if (!match) return 0n;
  if (dead(Number(match[1]))) {
    await retire(root, name);
    return 0n;
  }
  try {
    const value = await readFile(join(root, name, "ticket"), "utf8");
    if (!/^[1-9]\d{0,99}$/.test(value))
      throw new Error("Invalid preview cache reservation");
    return BigInt(value);
  } catch (error) {
    if (!missing(error)) throw error;
    try {
      await stat(join(root, name));
      return undefined;
    } catch (error) {
      if (missing(error)) return 0n;
      throw error;
    }
  }
}

// Lamport bakery ordering: registration is the choosing phase; rename publishes
// a complete ticket. Unique claim names avoid stale-reaper ABA races. A killed
// owner is removed only after ESRCH, including death before ticket publication.
export async function withCacheLock<T>(
  directory: string,
  operation: () => Promise<T>,
  timeoutMs = 5000,
): Promise<T> {
  const root = join(directory, ".admission-v2");
  await mkdir(root, { recursive: true });
  const name = `${process.pid}-${randomUUID()}`;
  await mkdir(join(root, name));
  let failed = false;
  let result!: T;
  let cleanupError: unknown;
  try {
    let maximum = 0n;
    for (const other of await readdir(root)) {
      const value = await ticket(root, other);
      if (value !== undefined && value > maximum) maximum = value;
    }
    const mine = maximum + 1n;
    await writeFile(join(root, name, "pending"), String(mine));
    await rename(join(root, name, "pending"), join(root, name, "ticket"));
    const deadline = performance.now() + timeoutMs;
    while (true) {
      let waiting = false;
      for (const other of await readdir(root)) {
        if (other === name) continue;
        const value = await ticket(root, other);
        if (
          value === undefined ||
          (value > 0n && (value < mine || (value === mine && other < name)))
        ) {
          waiting = true;
          break;
        }
      }
      if (!waiting) {
        result = await operation();
        break;
      }
      if (performance.now() >= deadline)
        throw new Error("Preview cache is busy. Retry shortly.");
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  } catch (error) {
    failed = true;
    throw error;
  } finally {
    try {
      await retire(root, name);
    } catch (error) {
      if (!failed) cleanupError = error;
    }
  }
  if (cleanupError) throw cleanupError;
  return result;
}
