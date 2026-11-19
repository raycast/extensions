import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

export function alive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

/** Detached task children lead a process group. Keep their slot reserved if
 * an external command outlives the Node child; never overlap orphan media work. */
export function taskGroupAlive(pid: number): boolean {
  if (alive(pid)) return true;
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(-pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

export function readJson<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return fallback;
    throw error; // Never replace unreadable state with an empty queue/history.
  }
}

export function writeJson(file: string, value: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const tmp = `${file}.${process.pid}.${randomUUID()}.tmp`;
  try {
    fs.writeFileSync(tmp, JSON.stringify(value, null, 2), { mode: 0o600, flag: "wx" });
    fs.renameSync(tmp, file);
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}

const held = new Set<string>();
const sleeper = new Int32Array(new SharedArrayBuffer(4));

/** Lamport bakery lock. Each contender owns a unique file, published atomically.
 * Dead contenders can be removed without unlinking a successor's lock. There is
 * no empty PID-file window and no age-based eviction of a live transaction.
 * Callbacks must be synchronous and short (never await or perform media work).
 */
export function transaction<T>(supportPath: string, callback: () => T): T {
  const dir = path.resolve(supportPath, "state-transactions");
  if (held.has(dir)) return callback();
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const key = `${process.pid}-${randomUUID()}.json`;
  const mine = path.join(dir, key);
  const participants = () => fs.readdirSync(dir).filter((name) => /^\d+-[\da-f-]+\.json$/.test(name));
  const inspect = (name: string) => {
    if (!alive(Number.parseInt(name, 10))) {
      fs.rmSync(path.join(dir, name), { force: true });
      return null;
    }
    return readJson<{ choosing: boolean; ticket: number } | null>(path.join(dir, name), null);
  };
  const deadline = Date.now() + 15000;
  try {
    writeJson(mine, { choosing: true, ticket: 0 });
    const ticket = 1 + participants().reduce((max, name) => Math.max(max, inspect(name)?.ticket ?? 0), 0);
    writeJson(mine, { choosing: false, ticket });
    for (const name of participants()) {
      if (name === key) continue;
      for (;;) {
        const other = inspect(name);
        if (!other || (!other.choosing && (other.ticket > ticket || (other.ticket === ticket && name > key)))) break;
        if (Date.now() > deadline) throw new Error("Task state is busy. Try again later.");
        Atomics.wait(sleeper, 0, 0, 10);
      }
    }
    held.add(dir);
    try {
      return callback();
    } finally {
      held.delete(dir);
    }
  } finally {
    fs.rmSync(mine, { force: true });
  }
}
